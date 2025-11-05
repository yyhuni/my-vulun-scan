# DAG 工作流快速入门指南

> 5 分钟快速上手动态 DAG 工作流系统

## 📋 前置条件

- ✅ Python 3.10+
- ✅ Django 4.2+
- ✅ Celery 5.3+
- ✅ Redis（作为 Celery broker 和 result backend）

## 🚀 快速实施（5 步完成）

### 步骤 1：创建 DAG 编排器（10 分钟）

**复制代码**：从完整文档中复制 `dag_orchestrator.py` 到：

```
backend/apps/scan/orchestrators/dag_orchestrator.py
```

**注册任务**：在 `DAGOrchestrator.TASK_REGISTRY` 中添加你的任务：

```python
TASK_REGISTRY = {
    'subdomain_discovery': None,  # 自动加载
    'port_scan': None,
    # 添加更多任务...
}
```

---

### 步骤 2：创建 Finalize 任务（5 分钟）

**创建文件**：`backend/apps/scan/tasks/finalize_scan_task.py`

**核心代码**：

```python
from celery import shared_task
from apps.scan.services import ScanService, ScanTaskService
from apps.common.definitions import ScanTaskStatus

@shared_task(name='finalize_scan', bind=True)
def finalize_scan_task(self, scan_id: int) -> dict:
    """完成扫描任务
    
    Note:
        使用 .si() 签名，不接收前面任务的返回值
        通过查询 ScanTask 表来获取所有任务的状态
    """
    scan_service = ScanService()
    task_service = ScanTaskService()
    
    # 统计任务状态
    stats = task_service.get_task_stats(
        scan_id,
        exclude_tasks=['initiate_scan', 'finalize_scan']
    )
    
    # 决定最终状态
    if stats['failed'] > 0:
        final_status = ScanTaskStatus.FAILED
    elif stats['aborted'] > 0:
        final_status = ScanTaskStatus.ABORTED
    else:
        final_status = ScanTaskStatus.SUCCESSFUL
    
    # 更新 Scan 状态
    scan_service.complete_scan(scan_id, final_status)
    
    return {'scan_id': scan_id, 'final_status': final_status.value}
```

---

### 步骤 3：修改信号处理器（10 分钟）

**文件**：`backend/apps/scan/signals/status_update_handler.py`

**关键修改 1**：跳过编排任务和收尾任务

```python
class StatusUpdateHandler:
    # 编排任务和收尾任务（完成时不触发 Scan 更新）
    ORCHESTRATOR_TASKS = {'initiate_scan', 'finalize_scan'}
    
    def on_task_success(self, ...):
        # ... 更新 ScanTask ...
        
        # 关键修改：跳过编排任务和收尾任务
        if task_name in self.ORCHESTRATOR_TASKS:
            return  # ← 不更新 Scan
```

**关键修改 2**：失败时立即更新

```python
def on_task_failure(self, ...):
    # ... 更新 ScanTask ...
    
    # 关键修改：立即更新 Scan
    self.scan_service.complete_scan(scan_id, ScanTaskStatus.FAILED)
```

**关键修改 3**：中止时立即更新

```python
def on_task_revoked(self, ...):
    # ... 更新 ScanTask ...
    
    # 关键修改：立即更新 Scan
    self.scan_service.complete_scan(scan_id, ScanTaskStatus.ABORTED)
```

---

### 步骤 4：添加 get_task_stats() 方法（5 分钟）

**文件**：`backend/apps/scan/services/scan_task_service.py`

```python
def get_task_stats(self, scan_id: int, exclude_tasks: List[str] = None) -> Dict[str, int]:
    """获取任务状态统计"""
    from django.db.models import Count, Q
    
    queryset = self.scan_task_repo.filter(scan_id=scan_id)
    
    if exclude_tasks:
        queryset = queryset.exclude(name__in=exclude_tasks)
    
    stats = queryset.aggregate(
        total=Count('id'),
        successful=Count('id', filter=Q(status=ScanTaskStatus.SUCCESSFUL)),
        failed=Count('id', filter=Q(status=ScanTaskStatus.FAILED)),
        aborted=Count('id', filter=Q(status=ScanTaskStatus.ABORTED))
    )
    
    return {
        'total': stats['total'] or 0,
        'successful': stats['successful'] or 0,
        'failed': stats['failed'] or 0,
        'aborted': stats['aborted'] or 0
    }
```

---

### 步骤 5：修改 WorkflowOrchestrator（3 分钟）

**文件**：`backend/apps/scan/orchestrators/workflow_orchestrator.py`

```python
from .dag_orchestrator import DAGOrchestrator

class WorkflowOrchestrator:
    def __init__(self):
        self.dag_orchestrator = DAGOrchestrator()
    
    def dispatch_workflow(self, scan: Scan, config: dict):
        """使用 DAG 编排器"""
        return self.dag_orchestrator.dispatch_workflow(scan, config)
```

---

## 📝 配置格式

### 简单示例（单任务）

```yaml
subdomain_discovery:
  enabled: true
  depends_on: []
```

### 串行示例（A → B）

```yaml
subdomain_discovery:
  enabled: true
  depends_on: []

port_scan:
  enabled: true
  depends_on: [subdomain_discovery]
```

### 并行示例（A → B ∥ C）

```yaml
subdomain_discovery:
  enabled: true
  depends_on: []

port_scan:
  enabled: true
  depends_on: [subdomain_discovery]

tech_stack:
  enabled: true
  depends_on: [subdomain_discovery]
```

### 复杂示例（A → B ∥ C → D）

```yaml
subdomain_discovery:
  enabled: true
  depends_on: []

port_scan:
  enabled: true
  depends_on: [subdomain_discovery]

tech_stack:
  enabled: true
  depends_on: [subdomain_discovery]

vuln_scan:
  enabled: true
  depends_on: [port_scan, tech_stack]
```

---

## 🧪 测试

### 1. 快速测试

```python
# Django Shell
python manage.py shell

from apps.scan.models import Scan
from apps.scan.tasks.initiate_scan_task import initiate_scan_task

# 获取一个 Scan
scan = Scan.objects.first()

# 启动扫描
result = initiate_scan_task.delay(scan.id)

# 查看结果
print(result.get(timeout=60))
```

### 2. 验证状态

```python
# 检查 Scan 状态
scan.refresh_from_db()
print(f"Scan 状态: {scan.status}")

# 检查 ScanTask
from apps.scan.models import ScanTask
tasks = ScanTask.objects.filter(scan=scan)
for task in tasks:
    print(f"{task.name}: {task.status}")
```

---

## 📊 执行流程

```
用户发起扫描
   ↓
initiate_scan_task 开始
   ├─ 解析配置
   ├─ 构建 DAG
   └─ 启动 workflow
   ↓
Stage 1: subdomain_discovery
   ├─ task_prerun → Scan = RUNNING
   ├─ 执行扫描...
   └─ task_success → ScanTask = SUCCESSFUL（Scan 不变）
   ↓
Stage 2: port_scan ∥ tech_stack（并行）
   ├─ 两个任务同时执行
   └─ 都完成 → ScanTask = SUCCESSFUL（Scan 不变）
   ↓
Stage 3: vuln_scan
   └─ task_success → ScanTask = SUCCESSFUL（Scan 不变）
   ↓
Stage 4: finalize_scan
   ├─ 统计所有 ScanTask
   ├─ 决定最终状态
   └─ 更新 Scan = SUCCESSFUL ✓
   ↓
完成
```

---

## ⚠️ 常见错误

### 错误 1：Scan 状态仍然过早更新

**原因**：信号处理器没有正确跳过

**解决**：检查 `on_task_success()` 中的条件：

```python
# 检查类常量是否定义
ORCHESTRATOR_TASKS = {'initiate_scan', 'finalize_scan'}

# 检查跳过逻辑
if task_name in self.ORCHESTRATOR_TASKS:
    return  # 这行必须存在
```

---

### 错误 2：finalize_scan_task 没有执行

**原因**：某个子任务失败，chain 中断

**解决**：检查任务日志，修复失败的任务

```bash
# 查看 Celery 日志
tail -f celery.log | grep ERROR
```

---

### 错误 3：循环依赖

**错误配置**：

```yaml
task_a:
  depends_on: [task_b]
task_b:
  depends_on: [task_a]  # ← 循环依赖
```

**解决**：调整依赖关系，确保无环

---

## 🔍 调试技巧

### 1. 查看 DAG 构建日志

```python
import logging
logging.getLogger('apps.scan.orchestrators').setLevel(logging.DEBUG)
```

### 2. 打印 workflow 结构

```python
workflow, task_names = orchestrator.dispatch_workflow(scan, config)
print(f"任务列表: {task_names}")
print(f"Workflow: {workflow}")
```

### 3. 查看执行阶段

```
[INFO] DAG 工作流构建完成
[INFO] 执行阶段: 3
[INFO]   Stage 1: subdomain_discovery
[INFO]   Stage 2: port_scan ∥ tech_stack (并行)
[INFO]   Stage 3: finalize_scan
```

---

## ✅ 验证清单

完成实施后，检查以下项：

- [ ] `dag_orchestrator.py` 文件已创建
- [ ] `finalize_scan_task.py` 文件已创建
- [ ] `status_update_handler.py` 已修改（3处）
- [ ] `scan_task_service.py` 添加了 `get_task_stats()`
- [ ] `workflow_orchestrator.py` 已修改
- [ ] 配置格式已更新
- [ ] 测试通过
- [ ] Scan 状态正确更新

---

## 📚 下一步

完成快速入门后，建议：

1. **阅读完整文档**：`DAG工作流实现方案.md`
2. **编写单元测试**：确保边缘情况正确处理
3. **监控和优化**：使用 Flower 监控任务执行
4. **灰度发布**：先在测试环境验证，再部署生产

---

## 🆘 需要帮助？

如果遇到问题：

1. **查看日志**：`celery.log`、`django.log`
2. **检查配置**：确保依赖关系正确
3. **运行测试**：`pytest backend/apps/scan/tests/`
4. **查阅文档**：`DAG工作流实现方案.md`

---

**预计完成时间**：30-40 分钟  
**难度**：⭐⭐⭐☆☆（中等）  
**收益**：⭐⭐⭐⭐⭐（极高）

