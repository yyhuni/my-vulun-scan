# 后端并发、锁和条件竞争问题审查报告

> 审查日期：2024年11月
> 审查范围：XingRin 扫描系统后端全部代码
> 重点关注：并发控制、锁机制、条件竞争、死锁风险

## 目录

- [执行摘要](#执行摘要)
- [高风险问题](#高风险问题)
- [中风险问题](#中风险问题)
- [低风险问题](#低风险问题)
- [最佳实践违背](#最佳实践违背)
- [改进建议](#改进建议)
- [详细分析](#详细分析)

## 执行摘要

经过全面审查，发现系统在并发控制方面存在 **7个高风险问题**、**5个中风险问题** 和 **3个低风险问题**。主要问题集中在：

1. **数据库事务隔离不当** - 可能导致脏读和幻读
2. **状态更新竞态条件** - 并发更新可能导致状态不一致
3. **文件系统操作冲突** - 多进程写同一文件可能损坏
4. **资源泄露风险** - 异步任务未正确清理资源
5. **死锁潜在风险** - 多表更新顺序不一致

## 高风险问题

### 1. 扫描状态更新竞态条件 🔴

**位置**: `apps/scan/services/scan_service.py:369-417`

**问题描述**:
```python
def update_status(self, scan_id: int, status: ScanStatus, ...):
    # ❌ 问题：没有使用行级锁，可能存在并发更新
    result = self.scan_repo.update_status(
        scan_id, 
        status, 
        message,
        started_at=started_at,
        stopped_at=stopped_at
    )
```

**风险场景**:
- Handler 和用户操作同时更新状态
- 多个 Worker 并发处理同一扫描任务
- 监控任务和 Handler 同时更新

**影响**: 状态不一致、数据覆盖、业务逻辑错误

**建议修复**:
```python
def update_status(self, scan_id: int, status: ScanStatus, ...):
    with transaction.atomic():
        # 使用 select_for_update 加行级锁
        scan = self.scan_repo.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        # 状态机验证，防止非法转换
        if not self._is_valid_transition(scan.status, status):
            logger.warning("非法状态转换: %s -> %s", scan.status, status)
            return False
        
        # 更新状态
        return self.scan_repo.update_status(...)
```

### 2. 批量保存域名的唯一约束冲突 🔴

**位置**: `apps/asset/repositories/django_subdomain_repository.py:28-35`

**问题描述**:
```python
# ❌ 问题：使用 ignore_conflicts=True 会丢失更新
Subdomain.objects.bulk_create(
    subdomain_objects,
    ignore_conflicts=True,  # 重复域名被忽略，不会更新关联
)
```

**风险场景**:
- 并发扫描同一目标
- 重复域名不会更新到新扫描

**影响**: 数据关联错误、统计不准确

**建议修复**:
```python
def upsert_many(self, items: List[SubdomainDTO]) -> int:
    with transaction.atomic():
        # 使用 Django 4.2+ 的 update_conflicts
        created = Subdomain.objects.bulk_create(
            subdomain_objects,
            update_conflicts=True,
            update_fields=['scan_id', 'target_id', 'updated_at'],
            unique_fields=['name', 'target_id', 'scan_id']
        )
    return len(created)
```

### 3. Flow 取消操作的竞态条件 🔴

**位置**: `apps/scan/services/scan_service.py:475-630`

**问题描述**:
```python
# ❌ 问题：检查状态和更新之间存在时间窗口
if scan.status not in [ScanStatus.RUNNING, ScanStatus.INITIATED]:
    return False, 0

# ... 这里可能有其他操作改变了状态 ...

self.update_status(scan_id, ScanStatus.CANCELLING, ...)
```

**建议修复**:
```python
def stop_scan(self, scan_id: int):
    with transaction.atomic():
        # 原子性检查并更新
        scan = self.scan_repo.get_by_id_for_update(scan_id, nowait=True)
        if scan.status not in [ScanStatus.RUNNING, ScanStatus.INITIATED]:
            return False, 0
        
        # 立即更新为 CANCELLING，防止其他操作
        scan.status = ScanStatus.CANCELLING
        scan.save(update_fields=['status'])
        
        # 后续操作...
```

### 4. 文件系统并发写入冲突 🔴

**位置**: `apps/scan/tasks/subdomain_discovery/run_scanner_task.py:116-124`

**问题描述**:
```python
# ❌ 问题：多个进程可能同时写入同一日志文件
with open(log_file, 'w', encoding='utf-8') as log_f:
    result = subprocess.run(
        actual_command,
        shell=True,
        stdout=subprocess.DEVNULL,
        stderr=log_f,
        timeout=timeout,
        check=False
    )
```

**风险场景**:
- 文件名碰撞（虽然有 UUID，但仍有极小概率）
- NFS 等网络文件系统的并发问题

**建议修复**:
```python
import fcntl
import tempfile

# 使用临时文件避免冲突
with tempfile.NamedTemporaryFile(
    mode='w',
    dir=result_path,
    prefix=f"{tool}_{timestamp}_",
    suffix='.log',
    delete=False,
    encoding='utf-8'
) as log_f:
    # 文件锁（可选，用于 NFS）
    fcntl.flock(log_f.fileno(), fcntl.LOCK_EX)
    try:
        result = subprocess.run(...)
    finally:
        fcntl.flock(log_f.fileno(), fcntl.LOCK_UN)
```

### 5. 异步任务资源泄露 🔴

**位置**: `apps/scan/tasks/monitor_cancellation_task.py:69-136`

**问题描述**:
```python
# ❌ 问题：异常时可能不释放 client 连接
async with get_client() as client:
    while (datetime.now() - start_time).total_seconds() < timeout_seconds:
        # 长时间循环，如果异常可能泄露连接
        flow_run = await client.read_flow_run(UUID(flow_run_id))
```

**建议修复**:
```python
async def monitor_cancellation_task(...):
    client = None
    try:
        client = get_client()
        async with client:
            # 监控逻辑
            pass
    except asyncio.CancelledError:
        # 正确处理取消
        logger.info("监控任务被取消")
        raise
    finally:
        # 确保清理
        if client:
            await client.aclose()
```

### 6. 数据库连接池耗尽风险 🔴

**位置**: `config/settings.py:101`

**问题描述**:
```python
# ❌ 问题：连接保持10分钟，高并发时可能耗尽
'CONN_MAX_AGE': 600,
```

**风险场景**:
- 大量并发请求
- 长时间运行的事务
- 连接泄露

**建议修复**:
```python
DATABASES = {
    'default': {
        ...
        'CONN_MAX_AGE': 60,  # 减少到1分钟
        'CONN_HEALTH_CHECKS': True,  # Django 4.1+ 健康检查
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',
            'pool_size': 20,  # 连接池大小
            'max_overflow': 10,  # 溢出连接数
        }
    }
}
```

### 7. Handler 竞态条件检测不完整 🔴

**位置**: `apps/scan/handlers/initiate_scan_flow_handlers.py:124-146`

**问题描述**:
```python
# ❌ 问题：读取状态和更新之间存在时间窗口
scan = service.scan_repo.get_by_id(scan_id)
if scan.status == ScanStatus.CANCELLING:
    # 这里可能状态已变
    success = service.update_status(scan_id, ScanStatus.CANCELLED, ...)
```

**建议修复**:
```python
def on_initiate_scan_flow_completed(...):
    with transaction.atomic():
        scan = service.scan_repo.get_by_id_for_update(scan_id)
        if scan.status == ScanStatus.CANCELLING:
            scan.status = ScanStatus.CANCELLED
            scan.stopped_at = timezone.now()
            scan.save()
```

## 中风险问题

### 1. 批量创建扫描任务的部分失败处理 ⚠️

**位置**: `apps/scan/services/scan_service.py:252-367`

**问题描述**:
```python
# ⚠️ 问题：部分任务创建失败，但已创建的继续执行
for scan in created_scans:
    try:
        flow_run_id = _submit_flow_deployment(...)
    except Exception as e:
        # 继续处理其他任务
        continue
```

**风险**: 一致性问题、用户困惑

**建议**: 使用 Saga 模式或两阶段提交

### 2. 文件系统清理的并发冲突 ⚠️

**位置**: `apps/scan/utils/directory_cleanup.py`

**问题描述**:
- 多个清理任务可能同时运行
- 删除目录时可能有新文件写入

**建议**: 使用分布式锁或单例模式

### 3. 流式处理大文件的内存控制 ⚠️

**位置**: `apps/scan/tasks/subdomain_discovery/save_domains_task.py:81-104`

**问题描述**:
```python
# ⚠️ 问题：批次大小固定，不考虑内存压力
batch_size: int = 5000
```

**建议**: 动态调整批次大小

### 4. Prefect Worker 并发限制 ⚠️

**问题描述**: 未配置 Worker 并发限制，可能过载

**建议**:
```python
# prefect.yaml
work_pool:
  type: process
  max_workers: 4  # 限制并发数
  task_runner:
    type: concurrent
    max_tasks: 10
```

### 5. 异步协程的错误传播 ⚠️

**位置**: `apps/scan/flows/subdomain_discovery_flow.py`

**问题描述**: 使用旧的 `.submit()` 模式，不是真正的异步

**建议**: 完全迁移到 async/await

## 低风险问题

### 1. 日志文件的并发写入 ℹ️

**问题**: 多个进程写同一日志文件

**建议**: 使用日志队列或 syslog

### 2. 统计查询的缓存失效 ℹ️

**问题**: 高频统计查询无缓存

**建议**: 添加 Redis 缓存层

### 3. UUID 碰撞理论风险 ℹ️

**问题**: 使用 4 位 UUID 可能碰撞

**建议**: 增加到 8 位或使用完整 UUID

## 最佳实践违背

### 1. 缺少分布式锁机制

系统没有使用 Redis 等分布式锁，在分布式部署时风险增大。

**建议实现**:
```python
import redis
from contextlib import contextmanager

@contextmanager
def distributed_lock(key: str, timeout: int = 10):
    r = redis.Redis()
    lock = r.lock(f"lock:{key}", timeout=timeout)
    lock.acquire()
    try:
        yield
    finally:
        lock.release()

# 使用示例
with distributed_lock(f"scan:{scan_id}"):
    # 关键操作
    pass
```

### 2. 缺少幂等性保证

多数操作不是幂等的，重试可能造成重复。

**建议**: 添加幂等键机制

### 3. 缺少并发测试

没有专门的并发测试用例。

**建议**: 添加并发测试套件

## 改进建议

### 1. 立即修复（P0）

1. **添加数据库行级锁**
   - 所有状态更新使用 `select_for_update()`
   - 关键操作使用事务包装

2. **实现状态机验证**
   ```python
   VALID_TRANSITIONS = {
       ScanStatus.INITIATED: [ScanStatus.RUNNING, ScanStatus.FAILED],
       ScanStatus.RUNNING: [ScanStatus.COMPLETED, ScanStatus.FAILED, ScanStatus.CANCELLING],
       ScanStatus.CANCELLING: [ScanStatus.CANCELLED],
       # ...
   }
   ```

3. **添加分布式锁**
   - 使用 Redis 实现分布式锁
   - 关键操作加锁保护

### 2. 短期改进（P1）

1. **优化数据库连接池**
   ```python
   # 使用 django-db-pool 或 SQLAlchemy
   pip install django-db-pool
   ```

2. **添加并发控制中间件**
   ```python
   class ConcurrencyMiddleware:
       def __init__(self, get_response):
           self.get_response = get_response
           self.semaphore = asyncio.Semaphore(100)  # 限制并发
   ```

3. **实现 Circuit Breaker 模式**
   ```python
   from circuit_breaker import CircuitBreaker
   
   @CircuitBreaker(failure_threshold=5, recovery_timeout=30)
   def critical_operation():
       pass
   ```

### 3. 长期改进（P2）

1. **迁移到事件驱动架构**
   - 使用消息队列解耦
   - 实现 Event Sourcing

2. **添加分布式追踪**
   - 集成 OpenTelemetry
   - 追踪并发操作

3. **实现 CQRS 模式**
   - 分离读写操作
   - 优化并发性能

## 详细分析

### 数据库层

#### 事务隔离级别

当前使用默认隔离级别（READ COMMITTED），存在以下风险：

1. **不可重复读**: 事务内多次读取可能不一致
2. **幻读**: 新增数据可能被读取

**建议配置**:
```python
DATABASES = {
    'default': {
        'OPTIONS': {
            'isolation_level': psycopg2.extensions.ISOLATION_LEVEL_REPEATABLE_READ,
        }
    }
}
```

#### 死锁预防

**潜在死锁场景**:
1. 扫描创建时更新多个表
2. 级联删除时的锁顺序

**预防措施**:
1. 统一锁获取顺序
2. 使用 `nowait` 选项
3. 设置锁超时

### Prefect 层

#### Task 并发控制

当前问题：
- 无并发限制
- 无资源配额
- 无优先级队列

建议实现：
```python
@task(
    name="heavy_task",
    tags=["resource-intensive"],
    task_run_name=lambda params: f"scan-{params['scan_id']}",
    concurrency_limit=5,  # 限制并发
    priority=1  # 优先级
)
```

#### Flow 状态管理

当前使用 5 个 Handler，但存在竞态条件。

**改进方案**:
1. 使用版本号（乐观锁）
2. 使用时间戳比较
3. 使用状态机严格控制

### 文件系统层

#### 并发写入保护

**问题区域**:
- 日志文件写入
- 结果文件生成
- 临时文件处理

**解决方案**:
```python
import portalocker

def safe_write_file(filepath, content):
    with open(filepath, 'w') as f:
        portalocker.lock(f, portalocker.LOCK_EX)
        try:
            f.write(content)
        finally:
            portalocker.unlock(f)
```

#### 目录操作原子性

使用临时目录和原子重命名：
```python
import tempfile
import shutil

# 创建临时目录
temp_dir = tempfile.mkdtemp(dir=parent_dir)
try:
    # 操作临时目录
    process_files(temp_dir)
    # 原子重命名
    os.rename(temp_dir, final_dir)
except:
    shutil.rmtree(temp_dir, ignore_errors=True)
    raise
```

## 测试建议

### 并发测试用例

```python
import threading
import pytest

def test_concurrent_status_update():
    """测试并发状态更新"""
    scan_id = create_scan()
    
    def update_worker(status):
        service = ScanService()
        service.update_status(scan_id, status)
    
    threads = []
    for status in [ScanStatus.RUNNING, ScanStatus.FAILED]:
        t = threading.Thread(target=update_worker, args=(status,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
    
    # 验证最终状态一致性
    scan = Scan.objects.get(id=scan_id)
    assert scan.status in [ScanStatus.RUNNING, ScanStatus.FAILED]
```

### 压力测试

```bash
# 使用 locust 进行压力测试
locust -f load_tests.py --host=http://localhost:8000 --users=100 --spawn-rate=10
```

## 监控指标

建议添加以下监控：

1. **并发指标**
   - 活跃连接数
   - 锁等待时间
   - 死锁次数

2. **性能指标**
   - 事务响应时间
   - 队列长度
   - 资源利用率

3. **错误指标**
   - 并发冲突次数
   - 重试次数
   - 超时次数

## 总结

系统在并发控制方面存在多个需要改进的地方，特别是：

1. **数据库层缺少适当的锁机制**
2. **状态管理存在竞态条件**
3. **文件系统操作缺少并发保护**
4. **缺少分布式环境下的协调机制**

建议按优先级逐步改进，首先解决高风险问题，确保数据一致性和系统稳定性。

## 附录

### A. 工具推荐

- **django-concurrency**: 乐观锁实现
- **django-guardian**: 细粒度权限控制
- **celery-redbeat**: 分布式任务调度
- **py-filelock**: 文件锁实现
- **redis-py**: Redis 分布式锁

### B. 参考资料

- [Django 数据库并发文档](https://docs.djangoproject.com/en/4.2/ref/models/querysets/#select-for-update)
- [PostgreSQL 锁机制](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Prefect 并发控制](https://docs.prefect.io/latest/concepts/tasks/#concurrency-limits)
- [Python 并发编程最佳实践](https://docs.python.org/3/library/concurrent.futures.html)

---

*本报告由安全审计团队编写，如有疑问请联系架构组。*
