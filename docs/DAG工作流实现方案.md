# DAG 工作流实现方案

## 一、方案概述

### 1.1 核心问题

在当前的扫描系统中，存在以下问题：

- **编排任务过早完成**：`initiate_scan_task` 启动子任务后立即返回，触发 `task_success` 信号
- **状态更新不一致**：Scan 模型被错误标记为完成，但子任务还在执行
- **缺乏灵活性**：任务依赖关系硬编码，难以扩展

### 1.2 解决方案

使用 **Celery Canvas + DAG（有向无环图）** 动态构建工作流：

- 通过配置定义任务依赖关系
- 使用拓扑排序自动构建执行阶段
- 添加 `finalize_scan_task` 作为唯一的完成标志
- 优化信号处理器，区分编排任务和执行任务

### 1.3 技术栈

- **Celery Canvas**：`chain`（串行）、`group`（并行）
- **拓扑排序**：Kahn 算法
- **Django Signals**：任务生命周期管理

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户发起扫描请求                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              initiate_scan_task（编排任务）                 │
│  - 解析配置                                                  │
│  - 调用 DAGOrchestrator 构建工作流                          │
│  - 启动 workflow.apply_async()                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              DAGOrchestrator（DAG 构建器）                  │
│  - 解析依赖关系                                              │
│  - 拓扑排序分组                                              │
│  - 构建 Celery Canvas                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Celery Workflow (Canvas)                    │
│                                                              │
│  Stage 1: subdomain_discovery_task                          │
│            ↓                                                 │
│  Stage 2: group(port_scan, tech_stack) ← 并行              │
│            ↓                                                 │
│  Stage 3: vuln_scan_task                                    │
│            ↓                                                 │
│  Stage 4: finalize_scan_task ← 统一更新 Scan 状态          │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            StatusUpdateHandler（信号处理器）                │
│  - task_prerun: 创建 ScanTask                               │
│  - task_success: 更新 ScanTask（跳过 Scan）                │
│  - task_failure: 立即更新 Scan = FAILED                     │
│  - task_revoked: 立即更新 Scan = ABORTED                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 状态流转图

```
┌──────────────────────────────────────────────────────────────┐
│                        Scan 状态流转                          │
└──────────────────────────────────────────────────────────────┘

PENDING (初始状态)
   │
   ├── task_prerun(initiate_scan) ──────────────────┐
   │                                                  │
   ▼                                                  │
RUNNING (扫描进行中)                                  │
   │                                                  │
   ├── 所有子任务执行中... ──────────────────────────┤
   │   - ScanTask(subdomain_discovery) 更新          │
   │   - ScanTask(port_scan) 更新                    │
   │   - ScanTask(vuln_scan) 更新                    │
   │   - Scan 状态保持 RUNNING                        │
   │                                                  │
   ├── task_failure(任何任务) ──────────────────────┐│
   │                                                 ││
   │                                                 ▼│
   │                                              FAILED
   │                                                 │
   ├── task_revoked(任何任务) ─────────────────────┐│
   │                                                ││
   │                                                ▼│
   │                                             ABORTED
   │                                                 │
   └── finalize_scan_task 完成 ────────────────────┐│
                                                    ││
                                                    ▼│
                                               SUCCESSFUL
```

---

## 三、实施步骤

### 步骤 1：创建 DAG 编排器

**文件**：`backend/apps/scan/orchestrators/dag_orchestrator.py`

**职责**：
- 解析配置中的任务依赖关系
- 使用拓扑排序构建执行阶段
- 动态构建 Celery Canvas workflow

**核心方法**：

```python
class DAGOrchestrator:
    def dispatch_workflow(self, scan, config):
        """根据配置动态构建 DAG"""
        # 1. 构建任务字典
        tasks = self._build_tasks(scan, config)
        
        # 2. 提取依赖关系
        dependencies = self._extract_dependencies(config, tasks.keys())
        
        # 3. 拓扑排序分组
        stages = self._build_dependency_stages(dependencies, tasks)
        
        # 4. 构建 workflow
        workflow = self._build_workflow(stages, scan.id)
        
        return workflow, task_names
```

**拓扑排序算法**（Kahn 算法）：

```python
def _build_dependency_stages(self, dependencies, tasks):
    """
    将任务按依赖层级分组
    
    输入：
    dependencies = {
        'subdomain_discovery': [],
        'port_scan': ['subdomain_discovery'],
        'tech_stack': ['subdomain_discovery'],
        'vuln_scan': ['port_scan', 'tech_stack']
    }
    
    输出：
    [
        [subdomain_discovery_sig],           # Stage 1
        [port_scan_sig, tech_stack_sig],     # Stage 2（并行）
        [vuln_scan_sig]                      # Stage 3
    ]
    """
    # 1. 计算入度
    in_degree = {task: 0 for task in tasks.keys()}
    for task, deps in dependencies.items():
        for dep in deps:
            in_degree[task] += 1
    
    # 2. BFS 遍历
    queue = deque([task for task, degree in in_degree.items() if degree == 0])
    stages = []
    
    while queue:
        # 当前层所有入度为 0 的任务
        current_stage = list(queue)
        stages.append([tasks[t] for t in current_stage])
        
        # 更新入度
        next_queue = deque()
        for task in current_stage:
            for other, deps in dependencies.items():
                if task in deps:
                    in_degree[other] -= 1
                    if in_degree[other] == 0:
                        next_queue.append(other)
        queue = next_queue
    
    return stages
```

---

### 步骤 2：创建 Finalize 任务

**文件**：`backend/apps/scan/tasks/finalize_scan_task.py`

**职责**：
- 在所有子任务完成后执行
- 统计所有 ScanTask 的状态
- 更新 Scan 的最终状态

**实现**：

```python
@shared_task(name='finalize_scan', bind=True)
def finalize_scan_task(self, scan_id: int) -> dict:
    """
    完成扫描任务
    
    Args:
        self: Celery task instance
        scan_id: 扫描 ID
    
    Returns:
        {'scan_id': int, 'final_status': str, 'message': str}
    
    Note:
        使用 .si() 签名，不接收前面任务的返回值
        通过查询 ScanTask 表来获取所有任务的状态
    """
    logger.info("开始完成扫描 - Scan ID: %s", scan_id)
    
    scan_service = ScanService()
    task_service = ScanTaskService()
    
    # 1. 获取所有子任务的状态统计
    stats = task_service.get_task_stats(
        scan_id,
        exclude_tasks=['initiate_scan', 'finalize_scan']
    )
    
    # 2. 决定最终状态
    if stats['aborted'] > 0:
        final_status = ScanTaskStatus.ABORTED
        message = f"扫描被中止 - 成功: {stats['successful']}, 中止: {stats['aborted']}"
    elif stats['failed'] > 0:
        final_status = ScanTaskStatus.FAILED
        message = f"扫描失败 - 成功: {stats['successful']}, 失败: {stats['failed']}"
    else:
        final_status = ScanTaskStatus.SUCCESSFUL
        message = f"扫描成功 - 完成: {stats['successful']} 个任务"
    
    # 3. 更新 Scan 状态
    scan_service.complete_scan(scan_id, final_status)
    
    logger.info("✓ 扫描完成 - Scan ID: %s, 状态: %s", scan_id, final_status.label)
    
    return {
        'scan_id': scan_id,
        'final_status': final_status.value,
        'message': message,
        'summary': stats
    }
```

---

### 步骤 3：修改信号处理器

**文件**：`backend/apps/scan/signals/status_update_handler.py`

**关键修改**：

#### 3.1 task_success - 跳过编排任务和收尾任务

```python
class StatusUpdateHandler:
    # 编排任务和收尾任务（完成时不触发 Scan 更新）
    ORCHESTRATOR_TASKS = {'initiate_scan', 'finalize_scan'}
    
    def on_task_success(self, sender=None, task_id=None, kwargs=None, **extra):
        """任务成功"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        task_name = getattr(sender, 'name', 'unknown')
        
        # 1. 更新 ScanTask 状态
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.SUCCESSFUL
        )
        
        # 2. 关键：跳过编排任务和收尾任务
        if task_name in self.ORCHESTRATOR_TASKS:
            logger.info(
                "编排/收尾任务完成，跳过 Scan 更新 - Task: %s, Scan ID: %s",
                task_name, scan_id
            )
            return  # ← 不更新 Scan
        
        # 3. 工作任务完成：不需要做任何事
        # 因为只有 finalize_scan 负责更新 Scan
        logger.info("工作任务完成 - Task: %s, Scan ID: %s", task_name, scan_id)
```

#### 3.2 task_failure - 立即更新 Scan

```python
def on_task_failure(self, sender=None, task_id=None, exception=None, 
                    kwargs=None, einfo=None, **extra):
    """任务失败：立即更新 Scan 状态"""
    scan_id = kwargs.get('scan_id') if kwargs else None
    if not scan_id:
        return
    
    task_name = getattr(sender, 'name', 'unknown')
    error_message = str(exception) if exception else 'Unknown error'
    
    logger.error("任务失败 - Task: %s, Scan ID: %s, 错误: %s", 
                 task_name, scan_id, error_message)
    
    # 1. 更新 ScanTask 状态
    self.task_service.update_task_status(
        scan_id=scan_id,
        task_name=task_name,
        task_id=task_id or '',
        status=ScanTaskStatus.FAILED,
        error_message=error_message,
        error_traceback=str(einfo) if einfo else ''
    )
    
    # 2. 关键：立即更新 Scan 状态
    # 因为 chain 会中断，finalize 不会执行
    logger.warning("任务失败，立即更新 Scan - Scan ID: %s", scan_id)
    self.scan_service.complete_scan(scan_id, ScanTaskStatus.FAILED)
```

#### 3.3 task_revoked - 立即更新 Scan

```python
def on_task_revoked(self, sender=None, request=None, terminated=None, 
                    signum=None, expired=None, **extra):
    """任务被中止：立即更新 Scan 状态"""
    if not request:
        return
    
    scan_id = request.kwargs.get('scan_id')
    if not scan_id:
        return
    
    task_name = request.task
    task_id = request.id
    
    # 判断中止原因
    reason = "任务被终止" if terminated else "任务被撤销"
    
    logger.warning("任务中止 - Task: %s, Scan ID: %s", task_name, scan_id)
    
    # 1. 更新 ScanTask 状态
    self.task_service.update_task_status(
        scan_id=scan_id,
        task_name=task_name,
        task_id=task_id,
        status=ScanTaskStatus.ABORTED,
        error_message=reason
    )
    
    # 2. 关键：立即更新 Scan 状态
    logger.warning("任务中止，立即更新 Scan - Scan ID: %s", scan_id)
    self.scan_service.complete_scan(scan_id, ScanTaskStatus.ABORTED)
```

---

### 步骤 4：实现 ScanTaskService.get_task_stats()

**文件**：`backend/apps/scan/services/scan_task_service.py`

```python
def get_task_stats(
    self, 
    scan_id: int, 
    exclude_tasks: List[str] = None
) -> Dict[str, int]:
    """
    获取 ScanTask 的状态统计
    
    Args:
        scan_id: 扫描 ID
        exclude_tasks: 要排除的任务名称列表（如 ['initiate_scan', 'finalize_scan']）
    
    Returns:
        {
            'total': int,
            'running': int,
            'successful': int,
            'failed': int,
            'aborted': int,
            'pending': int
        }
    """
    # 获取所有 ScanTask
    queryset = self.scan_task_repo.filter(scan_id=scan_id)
    
    # 排除指定任务
    if exclude_tasks:
        queryset = queryset.exclude(name__in=exclude_tasks)
    
    # 统计各状态数量
    from django.db.models import Count, Q
    
    stats = queryset.aggregate(
        total=Count('id'),
        running=Count('id', filter=Q(status=ScanTaskStatus.RUNNING)),
        successful=Count('id', filter=Q(status=ScanTaskStatus.SUCCESSFUL)),
        failed=Count('id', filter=Q(status=ScanTaskStatus.FAILED)),
        aborted=Count('id', filter=Q(status=ScanTaskStatus.ABORTED)),
        pending=Count('id', filter=Q(status=ScanTaskStatus.PENDING))
    )
    
    return {
        'total': stats['total'] or 0,
        'running': stats['running'] or 0,
        'successful': stats['successful'] or 0,
        'failed': stats['failed'] or 0,
        'aborted': stats['aborted'] or 0,
        'pending': stats['pending'] or 0
    }
```

---

### 步骤 5：修改 WorkflowOrchestrator

**文件**：`backend/apps/scan/orchestrators/workflow_orchestrator.py`

```python
from .dag_orchestrator import DAGOrchestrator

class WorkflowOrchestrator:
    """工作流编排器"""
    
    def __init__(self):
        """初始化编排器"""
        self.dag_orchestrator = DAGOrchestrator()
    
    def dispatch_workflow(self, scan: Scan, config: dict) -> Tuple[Optional[Any], list]:
        """
        根据配置编排工作流（使用 DAG）
        
        Args:
            scan: Scan 对象
            config: 配置字典
        
        Returns:
            (workflow, task_names): Celery workflow 和任务名称列表
        """
        logger.info("开始编排工作流 - Scan ID: %s", scan.id)
        
        # 使用 DAG 编排器
        workflow, task_names = self.dag_orchestrator.dispatch_workflow(scan, config)
        
        if not workflow:
            logger.warning("工作流构建失败 - Scan ID: %s", scan.id)
            return None, []
        
        logger.info("✓ 工作流已构建 - Scan ID: %s, 任务数: %d", scan.id, len(task_names))
        
        return workflow, task_names
```

---

### 步骤 6：配置格式（YAML）

**文件**：`engine.configuration` (存储在数据库中)

```yaml
# 子域名发现（第一阶段，无依赖）
subdomain_discovery:
  enabled: true
  depends_on: []  # 无依赖
  config:
    tools: [subfinder, amass]
    timeout: 600

# 端口扫描（依赖子域名发现）
port_scan:
  enabled: true
  depends_on: [subdomain_discovery]
  config:
    ports: [80, 443, 8080, 8443]
    scan_type: connect

# 技术栈识别（依赖子域名发现）
tech_stack:
  enabled: true
  depends_on: [subdomain_discovery]
  config:
    tools: [wappalyzer, whatweb]

# 漏洞扫描（依赖端口扫描和技术栈识别）
vuln_scan:
  enabled: true
  depends_on: [port_scan, tech_stack]
  config:
    scan_types: [xss, sqli, ssrf]
    depth: 2
```

**生成的 DAG**：

```
Stage 1: subdomain_discovery
         │
         ├──────────┬──────────┐
         │          │          │
Stage 2: port_scan  ∥  tech_stack  (并行)
         │          │          │
         └──────────┴──────────┘
                    │
Stage 3:       vuln_scan
                    │
Stage 4:    finalize_scan
```

---

## 四、测试验证

### 4.1 单元测试

**文件**：`backend/apps/scan/tests/test_dag_orchestrator.py`

```python
import pytest
from apps.scan.orchestrators.dag_orchestrator import DAGOrchestrator

class TestDAGOrchestrator:
    """DAG 编排器测试"""
    
    def test_simple_dependency(self):
        """测试简单依赖"""
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': []
            },
            'port_scan': {
                'enabled': True,
                'depends_on': ['subdomain_discovery']
            }
        }
        
        orchestrator = DAGOrchestrator()
        dependencies = orchestrator._extract_dependencies(config, config.keys())
        
        assert dependencies['subdomain_discovery'] == []
        assert dependencies['port_scan'] == ['subdomain_discovery']
    
    def test_parallel_tasks(self):
        """测试并行任务"""
        config = {
            'subdomain_discovery': {'enabled': True, 'depends_on': []},
            'port_scan': {'enabled': True, 'depends_on': ['subdomain_discovery']},
            'tech_stack': {'enabled': True, 'depends_on': ['subdomain_discovery']}
        }
        
        orchestrator = DAGOrchestrator()
        # 模拟 tasks
        tasks = {name: f"{name}_sig" for name in config.keys()}
        dependencies = orchestrator._extract_dependencies(config, tasks.keys())
        stages = orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 验证：Stage 1 有 1 个任务，Stage 2 有 2 个并行任务
        assert len(stages) == 2
        assert len(stages[0]) == 1  # subdomain_discovery
        assert len(stages[1]) == 2  # port_scan, tech_stack 并行
    
    def test_circular_dependency_detection(self):
        """测试循环依赖检测"""
        config = {
            'task_a': {'enabled': True, 'depends_on': ['task_b']},
            'task_b': {'enabled': True, 'depends_on': ['task_a']}
        }
        
        orchestrator = DAGOrchestrator()
        tasks = {name: f"{name}_sig" for name in config.keys()}
        dependencies = orchestrator._extract_dependencies(config, tasks.keys())
        stages = orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 应该返回空列表（检测到循环依赖）
        assert stages == []
```

---

### 4.2 集成测试

**文件**：`backend/apps/scan/tests/test_workflow_execution.py`

```python
import pytest
from celery import chain, group
from apps.scan.models import Scan, ScanTask
from apps.scan.tasks.initiate_scan_task import initiate_scan_task

@pytest.mark.django_db
class TestWorkflowExecution:
    """工作流执行测试"""
    
    def test_normal_execution(self, scan_with_config):
        """测试正常执行流程"""
        scan = scan_with_config
        
        # 1. 启动扫描
        result = initiate_scan_task.delay(scan.id)
        result.get(timeout=60)
        
        # 2. 验证 Scan 状态
        scan.refresh_from_db()
        assert scan.status == ScanTaskStatus.SUCCESSFUL
        
        # 3. 验证 ScanTask
        tasks = ScanTask.objects.filter(scan=scan)
        assert tasks.count() >= 2  # initiate + subdomain + finalize
        
        # 所有任务都应该成功
        for task in tasks:
            assert task.status == ScanTaskStatus.SUCCESSFUL
    
    def test_task_failure(self, scan_with_config, monkeypatch):
        """测试任务失败场景"""
        scan = scan_with_config
        
        # 模拟任务失败
        def mock_fail(*args, **kwargs):
            raise RuntimeError("Mock failure")
        
        monkeypatch.setattr(
            'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task.run',
            mock_fail
        )
        
        # 启动扫描
        with pytest.raises(RuntimeError):
            result = initiate_scan_task.delay(scan.id)
            result.get(timeout=60)
        
        # 验证 Scan 状态
        scan.refresh_from_db()
        assert scan.status == ScanTaskStatus.FAILED
```

---

## 五、部署和配置

### 5.1 Celery 配置

**文件**：`backend/config/celery.py`

```python
# Celery 配置
app.conf.update(
    # 启用结果后端（DAG 需要）
    result_backend='redis://localhost:6379/1',
    
    # 任务序列化
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    
    # 任务超时
    task_time_limit=3600,  # 1小时
    task_soft_time_limit=3300,  # 55分钟
    
    # 任务路由
    task_routes={
        'initiate_scan': {'queue': 'orchestrator'},
        'finalize_scan': {'queue': 'orchestrator'},
        'subdomain_discovery': {'queue': 'scans'},
        'port_scan': {'queue': 'scans'},
        'vuln_scan': {'queue': 'scans'},
    },
)
```

### 5.2 Worker 启动

```bash
# Orchestrator Worker（高并发）
celery -A config worker -Q orchestrator -c 50 --loglevel=info

# Scans Worker（中等并发）
celery -A config worker -Q scans -c 10 --loglevel=info
```

---

## 六、监控和调试

### 6.1 日志输出

**正常执行日志**：

```
[INFO] ============================================================
[INFO] 开始构建动态 DAG 工作流
[INFO] ============================================================
[INFO] ✓ 添加任务: subdomain_discovery
[INFO] ✓ 添加任务: port_scan
[INFO] ✓ 添加任务: tech_stack
[INFO] ============================================================
[INFO] DAG 工作流构建完成
[INFO] 总任务数: 4
[INFO] 执行阶段: 3
[INFO]   Stage 1: subdomain_discovery
[INFO]   Stage 2: port_scan ∥ tech_stack (并行)
[INFO]   Stage 3: finalize_scan
[INFO] ============================================================
[INFO] 任务开始执行 - Task: subdomain_discovery, Scan ID: 123
[INFO] 任务完成，等待 finalize - Task: subdomain_discovery, Scan ID: 123
[INFO] 任务开始执行 - Task: port_scan, Scan ID: 123
[INFO] 任务开始执行 - Task: tech_stack, Scan ID: 123
[INFO] 任务完成，等待 finalize - Task: port_scan, Scan ID: 123
[INFO] 任务完成，等待 finalize - Task: tech_stack, Scan ID: 123
[INFO] ============================================================
[INFO] 开始完成扫描 - Scan ID: 123
[INFO] ============================================================
[INFO] 任务统计: {'total': 3, 'successful': 3, 'failed': 0, 'aborted': 0}
[INFO] ============================================================
[INFO] ✓ 扫描完成 - Scan ID: 123, 状态: SUCCESSFUL
[INFO] ============================================================
```

### 6.2 Flower 监控

```bash
# 启动 Flower
celery -A config flower --port=5555

# 访问：http://localhost:5555
```

---

## 七、迁移指南

### 7.1 从现有系统迁移

**步骤**：

1. **备份数据库**：
   ```bash
   python manage.py dumpdata scan > backup.json
   ```

2. **创建新文件**：
   - `dag_orchestrator.py`
   - `finalize_scan_task.py`

3. **修改现有文件**：
   - `status_update_handler.py`
   - `workflow_orchestrator.py`

4. **更新配置**：
   - 修改 `engine.configuration` 为新格式

5. **运行测试**：
   ```bash
   pytest backend/apps/scan/tests/
   ```

6. **灰度发布**：
   - 先在测试环境验证
   - 逐步迁移到生产环境

### 7.2 兼容性说明

- ✅ **向后兼容**：现有的 ScanTask 数据不受影响
- ✅ **平滑迁移**：可以逐步启用新功能
- ⚠️ **配置格式**：需要更新 `engine.configuration`

---

## 八、常见问题（FAQ）

### Q1: 如果某个任务失败，会影响其他并行任务吗？

**答**：不会。在 `group` 中，任务是独立执行的。但是 `chain` 会在任何任务失败时中断，后续阶段不会执行。

### Q2: finalize_scan_task 会接收到什么参数？

**答**：`finalize_scan_task` **不接收**前面任务的返回值，因为使用了 `.si()` 签名。

它通过以下方式获取任务状态：
- 查询 `ScanTask` 表获取所有子任务的状态
- 调用 `ScanTaskService.get_task_stats()` 统计成功/失败数量
- 根据统计结果决定 Scan 的最终状态

**为什么不接收返回值？**
- `.si()` (signature immutable) 创建的签名不会传递参数
- 通过数据库查询更可靠，避免依赖 Celery result backend
- 状态已经记录在 ScanTask 表中，无需重复传递

### Q3: 如何添加新的任务类型？

**答**：
1. 在 `DAGOrchestrator.TASK_REGISTRY` 中注册新任务
2. 在配置中添加任务定义
3. 定义依赖关系

### Q4: 拓扑排序的时间复杂度是多少？

**答**：O(V + E)，其中 V 是任务数量，E 是依赖关系数量。对于典型的扫描场景（<10个任务），性能影响可忽略。

### Q5: 是否需要 Celery result backend？

**答**：**使用 Canvas 工作流（chain/group）时是必须的**。

**为什么必须启用？**
- Celery 需要 result backend 来协调 chain/group 的执行顺序
- 即使使用 `.si()` 不传递返回值，Celery 仍需要追踪任务完成状态
- group 需要等待所有并行任务完成，这依赖 result backend

**推荐配置：**
```python
result_backend='redis://localhost:6379/1'  # 或 'django-db://'
```

**不使用 Canvas 的情况：**
- 如果只是单独运行任务（不使用 chain/group），可以不启用
- 但本方案使用了 chain，所以必须启用

---

## 九、总结

### 优势

✅ **配置驱动**：依赖关系在配置中定义，无需修改代码  
✅ **自动并行**：拓扑排序自动识别可并行任务  
✅ **状态一致**：finalize 统一管理 Scan 状态  
✅ **易于扩展**：添加新任务只需修改配置  
✅ **错误处理**：失败/中止立即更新状态  

### 适用场景

- ✅ 复杂的任务依赖关系
- ✅ 需要并行优化的工作流
- ✅ 频繁变更的任务组合
- ✅ 需要精确状态管理的系统

---

## 十、附录

### A. 完整代码清单

- `backend/apps/scan/orchestrators/dag_orchestrator.py` - DAG 构建器（新增）
- `backend/apps/scan/tasks/finalize_scan_task.py` - 完成任务（新增）
- `backend/apps/scan/signals/status_update_handler.py` - 信号处理器（修改）
- `backend/apps/scan/services/scan_task_service.py` - 任务服务（添加 get_task_stats）
- `backend/apps/scan/orchestrators/workflow_orchestrator.py` - 编排器（修改）

### B. 数据库索引优化

```python
# backend/apps/scan/models.py

class ScanTask(models.Model):
    # ... 现有字段 ...
    
    class Meta:
        indexes = [
            models.Index(fields=['scan', 'status']),  # 优化状态统计查询
            models.Index(fields=['scan', 'name']),    # 优化任务名称过滤
        ]
```

### C. 参考资料

- [Celery Canvas 官方文档](https://docs.celeryproject.org/en/stable/userguide/canvas.html)
- [拓扑排序算法](https://en.wikipedia.org/wiki/Topological_sorting)
- [有向无环图（DAG）](https://en.wikipedia.org/wiki/Directed_acyclic_graph)

---

**文档版本**：v1.0  
**更新日期**：2025-11-05  
**作者**：Scanner Team  
**状态**：已完成

