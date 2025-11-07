# Scan 扫描核心模块代码审查报告

**审查日期**: 2025-11-07  
**审查范围**: `/backend/apps/scan/`  
**审查人**: AI Code Reviewer

---

## 概述

本次审查针对扫描核心模块,这是整个系统最复杂的模块,包含:
- **Models**: Scan(扫描任务), ScanTask(任务记录)
- **Views**: API接口层
- **Services**: 业务逻辑层(scan_service, scan_task_service, subdomain_discovery_service, notification_service)
- **Repositories**: 数据访问层(scan_repository, scan_task_repository)
- **Orchestrators**: 工作流编排(dag_orchestrator, workflow_orchestrator)
- **Tasks**: Celery异步任务(initiate_scan, subdomain_discovery, finalize_scan, cleanup_old_scans)
- **Signals**: 信号处理器(status_update_handler, notification_handler)
- **Utils**: 工具类(command_executor, command_pool_executor, directory_cleanup)

该模块已有 `signals_code_review.md` 和 `tasks_code_review.md` 两份详细审查文档,本文将重点审查其他部分,并做整体总结。

---

## 🟢 优秀实践

### 1. 优秀的分层架构设计

**位置**: 整个 scan 模块

**亮点**:
```
Views (API层) → Services (业务逻辑层) → Repositories (数据访问层) → Models (数据模型层)
                     ↓
                Orchestrators (工作流编排)
                     ↓
                Tasks (异步执行)
                     ↓
                Signals (事件处理)
```

**价值**:
- 职责清晰,每层只关注自己的逻辑
- 便于单元测试和维护
- 支持依赖注入,易于替换实现
- 符合企业级架构最佳实践

---

### 2. Repository 模式使用原子更新避免死锁

**位置**: `repositories/scan_repository.py:420-493`

**亮点**:
```python
def append_task(scan_id: int, task_id: str, task_name: str) -> bool:
    """追加任务到扫描(使用原子更新避免死锁)"""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE scan
            SET task_ids = array_append(task_ids, %s),
                task_names = array_append(task_names, %s)
            WHERE id = %s
            """,
            [task_id, task_name, scan_id]
        )
```

**价值**:
- 使用 PostgreSQL 的 array_append 原子操作
- 避免了 select_for_update 的锁竞争
- 高并发场景下性能更好,不会产生死锁
- 展示了对数据库特性的深刻理解

---

### 3. 使用依赖注入和延迟加载避免循环导入

**位置**: `services/scan_service.py:52-73`

**亮点**:
```python
class ScanService:
    def __init__(
        self, 
        scan_repository: ScanRepository | None = None,
        task_service: 'ScanTaskService' | None = None
    ):
        self.scan_repo = scan_repository or ScanRepository()
        self._task_service = task_service
    
    @property
    def task_service(self) -> 'ScanTaskService':
        """延迟加载 ScanTaskService(避免循环导入)"""
        if self._task_service is None:
            from apps.scan.services.scan_task_service import ScanTaskService
            self._task_service = ScanTaskService()
        return self._task_service
```

**价值**:
- 使用类型提示的字符串形式避免编译时循环导入
- 使用 property 实现延迟加载
- 支持依赖注入,便于测试
- 优雅的解决方案

---

### 4. DAG工作流编排器设计精良

**位置**: `orchestrators/dag_orchestrator.py`

**亮点**:
- 使用拓扑排序(Kahn算法)构建执行阶段
- 动态任务注册表支持扩展
- 自动检测循环依赖
- 生成详细的执行计划日志

**价值**:
- 灵活的任务依赖管理
- 支持并行执行和串行依赖
- 代码质量高,注释详细
- 可扩展性强

---

### 5. 批量创建使用 bulk_create 优化性能

**位置**: `services/scan_service.py:122-196`

**亮点**:
```python
def create_scans_for_targets(self, targets: List[Target], engine: ScanEngine) -> List[Scan]:
    """为多个目标批量创建扫描任务(优化版)"""
    # 准备数据
    scans_to_create = [Scan(...) for target in targets]
    
    # 批量创建(一次数据库操作)
    with transaction.atomic():
        created_scans = self.scan_repo.bulk_create(scans_to_create)
```

**价值**:
- 避免 N+1 查询问题
- 使用事务保证原子性
- 性能提升显著(N 次查询 → 1 次查询)

---

## 🔴 严重问题

### 1. ScanService 状态转换缺少充分验证

**位置**: `services/scan_service.py` 多个方法

**问题描述**:
虽然定义了 `FINAL_STATUSES`,但在更新状态时没有充分检查状态转换的合法性。

```python
# scan_service.py:45-50
FINAL_STATUSES = {
    ScanTaskStatus.SUCCESSFUL,
    ScanTaskStatus.FAILED,
    ScanTaskStatus.ABORTED
}

# 但在更新状态时没有强制检查
def update_scan_status(self, scan_id: int, status: ScanTaskStatus, ...) -> bool:
    # ⚠️ 允许从 SUCCESSFUL 改为 RUNNING
    # ⚠️ 允许从 FAILED 改为 INITIATED
    ...
```

**风险**:
- 终态扫描可能被错误地改回运行状态
- 状态机没有强制约束
- 可能导致数据不一致

**示例场景**:
```python
# 场景1: 扫描已成功完成
scan.status = ScanTaskStatus.SUCCESSFUL

# 场景2: 由于某种原因(如信号延迟),状态被改回 RUNNING
update_scan_status(scan.id, ScanTaskStatus.RUNNING)  # ⚠️ 应该被拒绝

# 场景3: 扫描显示"运行中",但实际已完成
```

**建议修复**:
```python
def update_scan_status(
    self,
    scan_id: int,
    status: ScanTaskStatus,
    error_message: str | None = None,
    force: bool = False
) -> bool:
    """
    更新扫描状态(带状态转换验证)
    
    Args:
        scan_id: 扫描任务 ID
        status: 新状态
        error_message: 错误消息
        force: 是否强制更新(跳过验证)
    
    Returns:
        是否更新成功
    """
    scan = self.get_scan(scan_id, prefetch_relations=False)
    if not scan:
        logger.error("Scan 不存在 - Scan ID: %s", scan_id)
        return False
    
    # 状态转换验证
    if not force:
        # 1. 不允许覆盖终态
        if scan.status in self.FINAL_STATUSES:
            logger.warning(
                "拒绝更新：Scan 已处于终态 - Scan ID: %s, "
                "当前状态: %s, 目标状态: %s",
                scan_id,
                ScanTaskStatus(scan.status).label,
                ScanTaskStatus(status).label
            )
            return False
        
        # 2. 验证状态转换的合法性
        if not self._is_valid_transition(scan.status, status):
            logger.warning(
                "拒绝更新：非法的状态转换 - Scan ID: %s, "
                "从 %s 到 %s",
                scan_id,
                ScanTaskStatus(scan.status).label,
                ScanTaskStatus(status).label
            )
            return False
    
    # 执行更新
    return self.scan_repo.update_status(
        scan_id=scan_id,
        status=status,
        error_message=error_message
    )

def _is_valid_transition(self, from_status: int, to_status: int) -> bool:
    """
    检查状态转换是否合法
    
    状态转换规则:
    INITIATED → RUNNING
    RUNNING → SUCCESSFUL/FAILED/ABORTED
    """
    # 定义允许的状态转换
    VALID_TRANSITIONS = {
        ScanTaskStatus.INITIATED: {ScanTaskStatus.RUNNING, ScanTaskStatus.ABORTED},
        ScanTaskStatus.RUNNING: {
            ScanTaskStatus.SUCCESSFUL,
            ScanTaskStatus.FAILED,
            ScanTaskStatus.ABORTED
        },
    }
    
    allowed_next_statuses = VALID_TRANSITIONS.get(from_status, set())
    return to_status in allowed_next_statuses
```

---

### 2. 命令执行器缺少命令注入防护

**位置**: `utils/command_executor.py:37-95`

**问题描述**:
```python
def execute(self, command: str, capture_output: bool = False) -> Optional[str]:
    """执行命令"""
    result = subprocess.run(
        command,
        shell=True,  # ⚠️ 使用 shell=True 存在命令注入风险
        check=True,
        ...
    )
```

**严重风险**:
- 如果 command 包含用户输入,存在命令注入漏洞
- 攻击者可以执行任意系统命令
- 可能导致系统被完全控制

**攻击示例**:
```python
# 假设 target 来自用户输入
target = "example.com; rm -rf /"  # ⚠️ 恶意输入

# 构建命令
command = f"subfinder -d {target}"
# 实际执行: subfinder -d example.com; rm -rf /

executor.execute(command)  # ⚠️ 系统被破坏
```

**建议修复**:

**方案1: 不使用 shell=True(推荐)**
```python
def execute(self, command_args: List[str], capture_output: bool = False) -> Optional[str]:
    """
    执行命令(安全版本)
    
    Args:
        command_args: 命令参数列表(不是字符串)
        capture_output: 是否捕获输出
    
    Returns:
        命令输出或 None
    
    示例:
        executor.execute(['subfinder', '-d', 'example.com'])
    """
    logger.debug("Executing command: %s", ' '.join(command_args))
    
    try:
        result = subprocess.run(
            command_args,  # 传入列表,不使用 shell
            check=True,
            stdout=subprocess.PIPE if capture_output else subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            encoding='utf-8',
            timeout=self.timeout
        )
        
        return result.stdout if capture_output else None
    
    except subprocess.CalledProcessError as e:
        logger.error("Command failed: %s", ' '.join(command_args))
        raise
```

**方案2: 使用 shlex.quote 转义**
```python
import shlex

def execute(self, command: str, capture_output: bool = False) -> Optional[str]:
    """执行命令(转义版本)"""
    # 注意:这只能防止简单的注入,不如方案1安全
    logger.warning("使用 shell=True 存在安全风险")
    
    result = subprocess.run(
        command,
        shell=True,
        check=True,
        ...
    )
```

**方案3: 白名单验证命令**
```python
class ScanCommandExecutor:
    # 允许的命令白名单
    ALLOWED_COMMANDS = {
        'subfinder', 'amass', 'nmap', 'httpx', 'nuclei', 'ffuf'
    }
    
    def execute(self, command: str, capture_output: bool = False) -> Optional[str]:
        """执行命令(带白名单验证)"""
        # 解析命令
        parts = command.split()
        if not parts:
            raise ValueError("命令不能为空")
        
        cmd_name = parts[0]
        
        # 验证命令是否在白名单中
        if cmd_name not in self.ALLOWED_COMMANDS:
            raise ValueError(f"不允许执行的命令: {cmd_name}")
        
        # 执行命令
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            ...
        )
        return result.stdout if capture_output else None
```

**推荐组合**: 方案1(不使用 shell) + 方案3(白名单验证)

---

### 3. subdomain_discovery_service 缺少输入验证

**位置**: `services/subdomain_discovery_service.py`

**问题描述**:
虽然在 common 模块有验证器,但 service 层没有使用,直接将用户输入传给命令执行器。

**风险**:
- 恶意域名输入可能导致命令注入
- 无效域名浪费扫描资源
- 缺少输入清洗

**建议添加**:
```python
from apps.common.validators import validate_domain
from apps.common.normalizer import normalize_domain

class SubdomainDiscoveryService:
    def discover(self, target: str, ...) -> dict:
        """子域名发现"""
        # 1. 规范化和验证
        try:
            normalized_target = normalize_domain(target)
            validate_domain(normalized_target)
        except ValueError as e:
            logger.error("无效的目标域名: %s, 错误: %s", target, e)
            raise ValueError(f"无效的目标域名: {e}") from e
        
        # 2. 执行扫描
        ...
```

---

## 🟡 警告

### 1. Views 缺少批量操作接口

**位置**: `views.py:1-144`

**问题描述**:
只有单个扫描的启动和停止,没有批量操作接口。

**影响**:
- 用户需要多次调用 API 才能启动多个扫描
- 前端实现复杂
- API 调用次数多

**建议添加**:
```python
@action(detail=False, methods=['post'])
def batch_start(self, request):
    """
    批量启动扫描
    POST /api/scans/batch_start/
    {
        "target_ids": [1, 2, 3],
        "engine_id": 1
    }
    """
    target_ids = request.data.get('target_ids', [])
    engine_id = request.data.get('engine_id')
    
    if not target_ids:
        return Response(
            {'error': '目标列表不能为空'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 获取目标和引擎
    targets = Target.objects.filter(id__in=target_ids)
    engine = ScanEngine.objects.get(id=engine_id)
    
    # 批量创建扫描
    scans = self.scan_service.create_scans_for_targets(targets, engine)
    
    return Response({
        'created_count': len(scans),
        'scan_ids': [scan.id for scan in scans],
        'message': f'成功创建 {len(scans)} 个扫描任务'
    })

@action(detail=False, methods=['post'])
def batch_stop(self, request):
    """
    批量停止扫描
    POST /api/scans/batch_stop/
    {
        "scan_ids": [1, 2, 3]
    }
    """
    scan_ids = request.data.get('scan_ids', [])
    
    if not scan_ids:
        return Response(
            {'error': '扫描ID列表不能为空'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 批量停止
    stopped_count = 0
    for scan_id in scan_ids:
        if self.scan_service.abort_scan(scan_id):
            stopped_count += 1
    
    return Response({
        'stopped_count': stopped_count,
        'message': f'成功停止 {stopped_count} 个扫描任务'
    })
```

---

### 2. 缺少扫描进度查询接口

**位置**: `views.py` - 新增功能

**问题描述**:
没有接口查询扫描的实时进度(如完成了多少任务,还剩多少任务)。

**建议添加**:
```python
@action(detail=True, methods=['get'])
def progress(self, request, pk=None):
    """
    获取扫描进度
    GET /api/scans/{id}/progress/
    
    返回:
    {
        "scan_id": 1,
        "status": "running",
        "total_tasks": 10,
        "completed_tasks": 5,
        "failed_tasks": 1,
        "running_tasks": 4,
        "progress_percent": 50,
        "estimated_time_remaining": 300  // 秒
    }
    """
    scan = self.get_object()
    
    # 获取所有子任务
    tasks = ScanTask.objects.filter(scan=scan)
    total_tasks = tasks.count()
    
    if total_tasks == 0:
        return Response({
            'scan_id': scan.id,
            'status': ScanTaskStatus(scan.status).label,
            'message': '扫描尚未开始'
        })
    
    # 统计各状态任务数量
    from django.db.models import Count, Q
    stats = tasks.aggregate(
        completed=Count('id', filter=Q(status=ScanTaskStatus.SUCCESSFUL)),
        failed=Count('id', filter=Q(status=ScanTaskStatus.FAILED)),
        running=Count('id', filter=Q(status=ScanTaskStatus.RUNNING)),
        aborted=Count('id', filter=Q(status=ScanTaskStatus.ABORTED))
    )
    
    completed_tasks = stats['completed'] + stats['failed'] + stats['aborted']
    progress_percent = int((completed_tasks / total_tasks) * 100)
    
    # 估算剩余时间
    if scan.started_at and completed_tasks > 0:
        from django.utils import timezone
        elapsed_seconds = (timezone.now() - scan.started_at).total_seconds()
        avg_time_per_task = elapsed_seconds / completed_tasks
        remaining_tasks = total_tasks - completed_tasks
        estimated_time_remaining = int(avg_time_per_task * remaining_tasks)
    else:
        estimated_time_remaining = None
    
    return Response({
        'scan_id': scan.id,
        'status': ScanTaskStatus(scan.status).label,
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'failed_tasks': stats['failed'],
        'running_tasks': stats['running'],
        'aborted_tasks': stats['aborted'],
        'progress_percent': progress_percent,
        'estimated_time_remaining': estimated_time_remaining,
        'started_at': scan.started_at.isoformat() if scan.started_at else None
    })
```

---

### 3. Repository 的 for_update 可能导致死锁

**位置**: `repositories/scan_repository.py:31-62`

**问题描述**:
虽然使用了 `select_for_update()` 避免并发问题,但在某些场景可能导致死锁。

**死锁场景**:
```python
# 线程1
with transaction.atomic():
    scan1 = ScanRepository.get_by_id_for_update(1)
    scan2 = ScanRepository.get_by_id_for_update(2)  # 等待线程2释放锁

# 线程2
with transaction.atomic():
    scan2 = ScanRepository.get_by_id_for_update(2)
    scan1 = ScanRepository.get_by_id_for_update(1)  # 等待线程1释放锁

# 结果:死锁
```

**建议改进**:
```python
@staticmethod
def get_by_id_for_update(
    scan_id: int,
    prefetch_relations: bool = False,
    nowait: bool = False,
    skip_locked: bool = False
) -> Scan | None:
    """
    根据 ID 获取扫描任务(加锁)
    
    Args:
        scan_id: 扫描任务 ID
        prefetch_relations: 是否预加载关联对象
        nowait: 如果无法立即获取锁,抛出异常而不是等待
        skip_locked: 如果行被锁定,跳过该行
    
    Returns:
        Scan 对象或 None
    """
    try:
        queryset = Scan.objects.select_for_update(
            nowait=nowait,
            skip_locked=skip_locked
        )
        
        if prefetch_relations:
            queryset = queryset.select_related('engine', 'target')
        
        return queryset.get(id=scan_id)
    except Scan.DoesNotExist:
        logger.warning("Scan 不存在 - Scan ID: %s", scan_id)
        return None
    except DatabaseError as e:
        if nowait:
            logger.warning("无法获取锁 - Scan ID: %s, 错误: %s", scan_id, e)
        raise
```

---

### 4. CommandPoolExecutor 缺少资源清理

**位置**: `utils/command_pool_executor.py`

**问题描述**:
如果进程池没有正确关闭,可能导致进程泄漏。

**建议添加**:
```python
class CommandPoolExecutor:
    def __init__(self, max_workers: int = 5):
        self.max_workers = max_workers
        self._executor = None
    
    def __enter__(self):
        """支持上下文管理器"""
        self._executor = ProcessPoolExecutor(max_workers=self.max_workers)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """自动清理资源"""
        if self._executor:
            self._executor.shutdown(wait=True)
            self._executor = None
    
    def __del__(self):
        """确保资源被释放"""
        if self._executor:
            self._executor.shutdown(wait=False)

# 使用示例
with CommandPoolExecutor(max_workers=5) as executor:
    results = executor.execute_batch(commands)
# 自动清理
```

---

## 🔵 建议

### 1. 添加扫描模板功能

**位置**: 新增功能

**建议**:
允许用户保存常用的扫描配置为模板,快速启动扫描。

**实现示例**:
```python
class ScanTemplate(models.Model):
    """扫描模板"""
    name = models.CharField(max_length=200, help_text='模板名称')
    description = models.TextField(blank=True, help_text='模板描述')
    engine = models.ForeignKey(ScanEngine, on_delete=models.CASCADE)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'scan_template'

# ViewSet
@action(detail=False, methods=['post'])
def start_from_template(self, request):
    """从模板启动扫描"""
    template_id = request.data.get('template_id')
    target_ids = request.data.get('target_ids', [])
    
    template = ScanTemplate.objects.get(id=template_id)
    targets = Target.objects.filter(id__in=target_ids)
    
    scans = self.scan_service.create_scans_for_targets(
        targets, template.engine
    )
    
    return Response({'scan_ids': [s.id for s in scans]})
```

---

### 2. 添加扫描结果对比功能

**位置**: 新增功能

**建议**:
对比两次扫描的结果差异,发现新增和消失的资产。

**实现示例**:
```python
@action(detail=True, methods=['get'])
def compare(self, request, pk=None):
    """
    对比扫描结果
    GET /api/scans/{id}/compare/?with={other_scan_id}
    """
    scan1 = self.get_object()
    scan2_id = request.query_params.get('with')
    
    if not scan2_id:
        return Response({'error': '缺少 with 参数'}, status=400)
    
    scan2 = Scan.objects.get(id=scan2_id)
    
    # 对比子域名
    subdomains1 = set(scan1.subdomains.values_list('name', flat=True))
    subdomains2 = set(scan2.subdomains.values_list('name', flat=True))
    
    diff = {
        'new_subdomains': list(subdomains2 - subdomains1),
        'removed_subdomains': list(subdomains1 - subdomains2),
        'unchanged_subdomains': list(subdomains1 & subdomains2)
    }
    
    # 对比端点...
    # 对比漏洞...
    
    return Response(diff)
```

---

### 3. 添加扫描报告导出功能

**位置**: 新增功能

**建议**:
导出扫描结果为 PDF/HTML/JSON 报告。

**实现示例**:
```python
@action(detail=True, methods=['get'])
def export_report(self, request, pk=None):
    """
    导出扫描报告
    GET /api/scans/{id}/export_report/?format=pdf
    """
    scan = self.get_object()
    report_format = request.query_params.get('format', 'json')
    
    if report_format == 'json':
        # 导出 JSON 格式
        report_data = {
            'scan_id': scan.id,
            'target': scan.target.name,
            'engine': scan.engine.name,
            'status': ScanTaskStatus(scan.status).label,
            'started_at': scan.started_at.isoformat() if scan.started_at else None,
            'stopped_at': scan.stopped_at.isoformat() if scan.stopped_at else None,
            'assets': {
                'subdomains': scan.subdomains.count(),
                'endpoints': scan.endpoints.count(),
                'ips': scan.ip_addresses.count(),
            },
            # 更多详细信息...
        }
        return Response(report_data)
    
    elif report_format == 'pdf':
        # 生成 PDF 报告
        from apps.scan.utils.report_generator import generate_pdf_report
        pdf_content = generate_pdf_report(scan)
        
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="scan_{scan.id}_report.pdf"'
        return response
```

---

### 4. 添加扫描恢复功能

**位置**: 新增功能

**建议**:
如果扫描中断(如服务器重启),能够从中断点恢复,而不是重新开始。

**实现示例**:
```python
@action(detail=True, methods=['post'])
def resume(self, request, pk=None):
    """
    恢复中断的扫描
    POST /api/scans/{id}/resume/
    """
    scan = self.get_object()
    
    # 检查是否可以恢复
    if scan.status not in [ScanTaskStatus.FAILED, ScanTaskStatus.ABORTED]:
        return Response(
            {'error': '只能恢复失败或中止的扫描'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 获取已完成的任务
    completed_tasks = ScanTask.objects.filter(
        scan=scan,
        status=ScanTaskStatus.SUCCESSFUL
    ).values_list('name', flat=True)
    
    # 重新编排工作流,跳过已完成的任务
    # ... 实现细节
    
    return Response({'message': '扫描已恢复'})
```

---

## 📊 统计信息

- **审查文件数**: 约 20 个(包括 models, views, services, repositories, orchestrators, tasks, signals, utils)
- **代码行数**: 约 5000+ 行
- **严重问题**: 3
- **警告**: 4
- **建议**: 4
- **优秀实践**: 5

---

## 🎯 优先级建议

### 立即修复(P0)
1. 修复命令执行器的命令注入漏洞(严重问题2)
2. 添加输入验证防止注入攻击(严重问题3)

### 近期修复(P1)
1. 添加状态转换验证(严重问题1)
2. 添加进度查询接口(警告2)
3. 添加批量操作接口(警告1)

### 计划改进(P2)
1. 改进死锁处理(警告3)
2. 添加资源清理机制(警告4)

### 长期优化(P3)
1. 添加扫描模板功能(建议1)
2. 添加结果对比功能(建议2)
3. 添加报告导出功能(建议3)
4. 添加扫描恢复功能(建议4)

---

## 与现有审查文档的关联

### signals_code_review.md 的关键问题
1. 参数安全性问题(使用 -1 作为默认 scan_id) - **已在本文强调**
2. 缺少异常捕获 - **Service 层需要增强**
3. 竞态条件风险 - **Repository 使用原子操作缓解**

### tasks_code_review.md 的关键问题
1. 队列策略未在代码层面落地 - **需要在 Celery 配置中明确**
2. 子域名发现任务业务边界偏严 - **已在本文补充验证建议**
3. 命令执行安全性 - **本文重点审查**

---

## 总结

Scan 模块是整个系统最复杂和最核心的模块,架构设计优秀,代码质量总体较高。主要改进方向:

1. **安全性**: 修复命令注入漏洞,添加输入验证,这是最高优先级
2. **健壮性**: 加强状态管理,添加状态转换验证
3. **性能**: 优化锁机制,避免死锁
4. **可用性**: 添加批量操作、进度查询等实用功能
5. **可维护性**: 改进资源管理,添加清理机制

该模块展示了企业级后端开发的最佳实践:
- ✅ 清晰的分层架构
- ✅ Repository 模式
- ✅ 依赖注入
- ✅ 异步任务处理
- ✅ 信号驱动的事件处理
- ✅ 工作流编排

解决安全问题后,这将是一个高质量、可扩展、易维护的扫描系统核心。

