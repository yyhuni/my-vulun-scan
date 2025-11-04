# 扫描任务状态管理与控制方案（解耦架构设计）

## 一、设计目标

### 核心原则：关注点分离（Separation of Concerns）

```
┌─────────────────────────────────────────────────────────┐
│                   Task Layer (任务层)                    │
│               - 只负责业务逻辑执行                        │
│               - 返回执行结果                              │
│               - 不直接操作数据库                          │
│               - 不发送通知                                │
│               - 不清理资源                                │
└─────────────────────────────────────────────────────────┘
                            ↓ (发送信号)
┌─────────────────────────────────────────────────────────┐
│              Celery Signals (信号机制)                   │
│   - task_prerun (任务开始前)                             │
│   - task_postrun (任务结束后)                            │
│   - task_success (任务成功)                              │
│   - task_failure (任务失败)                              │
│   - task_revoked (任务撤销)                              │
└─────────────────────────────────────────────────────────┘
                            ↓ (触发监听器)
┌─────────────────────────────────────────────────────────┐
│           Signal Handlers (信号处理器层)                 │
│   - StatusUpdateHandler (状态更新)                       │
│   - NotificationHandler (通知发送)                       │
│   - CleanupHandler (资源清理)                            │
│   - MetricsHandler (指标收集)                            │
└─────────────────────────────────────────────────────────┘
                            ↓ (调用服务)
┌─────────────────────────────────────────────────────────┐
│              Service Layer (服务层)                      │
│   - ScanStatusService (状态管理)                         │
│   - NotificationService (通知服务)                       │
│   - CleanupService (清理服务)                            │
│   - TaskControlService (任务控制)                        │
└─────────────────────────────────────────────────────────┘
```

---

## 二、核心机制：Celery Signals

### 2.1 可用信号列表

| 信号 | 触发时机 | 用途 |
|------|---------|------|
| `task_prerun` | 任务开始执行前 | 更新状态为 RUNNING，发送开始通知 |
| `task_postrun` | 任务执行后（无论成功失败） | 清理资源（目录、文件） |
| `task_success` | 任务成功完成 | 更新状态为 SUCCESSFUL，发送成功通知 |
| `task_failure` | 任务失败 | 更新状态为 FAILED，发送失败通知 |
| `task_revoked` | 任务被撤销 | 更新状态为 ABORTED，发送中止通知 |
| `task_retry` | 任务重试 | 记录重试次数，发送重试通知 |

### 2.2 信号传递的参数

```python
# task_prerun
{
    'task_id': 'abc-123',          # 任务 ID
    'task': <Task object>,         # 任务对象
    'args': (arg1, arg2),          # 位置参数
    'kwargs': {                    # 关键字参数
        'scan_id': 1,
        'target': 'example.com',
        'results_dir': '/path/to/dir'
    }
}

# task_success
{
    'result': {'success': True},   # 任务返回结果
    'task_id': 'abc-123',
    'sender': <Task object>,
    ...
}

# task_failure
{
    'exception': <Exception>,      # 异常对象
    'traceback': '...',            # 堆栈信息
    'einfo': <ExceptionInfo>,      # 异常详情
    ...
}
```

---

## 三、解耦优势

### 3.1 对比传统方式

| 维度 | 传统方式（耦合） | 解耦方式（信号） |
|------|----------------|----------------|
| **代码位置** | 任务内部 | 信号处理器 |
| **关注点** | 业务逻辑 + 状态 + 通知 + 清理 | 任务只关注业务逻辑 |
| **可测试性** | 难以单独测试业务逻辑 | 业务逻辑独立测试 |
| **可维护性** | 代码混杂，难以维护 | 职责清晰，易于维护 |
| **可扩展性** | 修改需要改动任务代码 | 添加新处理器即可 |
| **重用性** | 每个任务都需要重复代码 | 处理器全局重用 |

### 3.2 解耦后的任务代码示例

```python
# 传统方式（耦合）- 180 行
@shared_task
def subdomain_discovery_task(target, scan_id, results_dir):
    # 更新状态
    scan = Scan.objects.get(id=scan_id)
    scan.status = RUNNING
    scan.save()
    
    # 发送通知
    send_notification(scan_id, 'started')
    
    try:
        # 业务逻辑
        result = subdomain_discovery(target)
        
        # 更新状态
        scan.status = SUCCESSFUL
        scan.save()
        
        # 发送通知
        send_notification(scan_id, 'completed')
        
        # 清理资源
        shutil.rmtree(results_dir)
        
        return result
    except Exception as e:
        # 更新状态
        scan.status = FAILED
        scan.error_message = str(e)
        scan.save()
        
        # 发送通知
        send_notification(scan_id, 'failed', str(e))
        
        # 清理资源
        shutil.rmtree(results_dir)
        
        raise


# 解耦方式（信号）- 30 行
@shared_task
def subdomain_discovery_task(target, scan_id, results_dir):
    """纯业务逻辑，信号处理器自动处理状态/通知/清理"""
    result = subdomain_discovery(target)
    return {
        'success': True,
        'total': len(result),
        'data': result
    }
    # 状态更新 → StatusUpdateHandler
    # 通知发送 → NotificationHandler
    # 资源清理 → CleanupHandler
```

---

## 四、目录结构

```
backend/apps/scan/
├── tasks/
│   ├── __init__.py
│   ├── subdomain_discovery_task.py      # 纯业务逻辑
│   └── port_scan_task.py
│
├── signals/
│   ├── __init__.py
│   ├── handlers.py                      # 信号处理器
│   └── registry.py                      # 信号注册
│
├── services/
│   ├── __init__.py
│   ├── scan_status_service.py           # 状态管理服务
│   ├── notification_service.py          # 通知服务
│   ├── cleanup_service.py               # 清理服务
│   └── task_control_service.py          # 任务控制服务
│
├── orchestrators/
│   └── workflow_orchestrator.py
│
└── apps.py                               # Django App 配置（注册信号）
```

---

## 五、实现要点

### 5.1 信号处理器职责

| 处理器 | 监听信号 | 职责 |
|--------|---------|------|
| **StatusUpdateHandler** | `task_prerun`, `task_success`, `task_failure`, `task_revoked` | 更新 Scan 和 ScanTask 的状态字段 |
| **NotificationHandler** | `task_prerun`, `task_success`, `task_failure` | 发送 WebSocket/邮件/Webhook 通知 |
| **CleanupHandler** | `task_postrun` | 删除 results_dir 目录及临时文件 |
| **MetricsHandler** | `task_success`, `task_failure` | 收集任务执行指标（耗时、成功率） |

### 5.2 信号注册时机

在 Django App 启动时自动注册所有信号：

```python
# apps/scan/apps.py
class ScanConfig(AppConfig):
    name = 'apps.scan'
    
    def ready(self):
        """应用就绪时注册信号"""
        from apps.scan.signals.registry import register_all_signals
        register_all_signals()
```

### 5.3 任务中止流程

```
1. 用户发起中止请求
   ↓
2. TaskControlService.abort_scan(scan_id)
   ├─ 更新 Scan.status = ABORTED
   └─ 调用 celery.control.revoke(task_id, terminate=True)
   ↓
3. Celery 发送 SIGTERM 信号给 Worker
   ↓
4. 触发 task_revoked 信号
   ↓
5. StatusUpdateHandler.on_task_revoked()
   ├─ 更新 ScanTask.status = ABORTED
   └─ NotificationHandler 发送中止通知
   ↓
6. 触发 task_postrun 信号
   ↓
7. CleanupHandler.on_task_postrun()
   └─ 清理 results_dir 目录
```

---

## 六、关键服务接口

### 6.1 ScanStatusService

```python
class ScanStatusService:
    def update_status(scan_id, status, message=None) -> bool
    def update_task_status(scan_id, task_name, task_id, status) -> bool
```

### 6.2 NotificationService

```python
class NotificationService:
    def send(scan_id, event_type, message, data=None) -> bool
```

支持的通知方式：
- WebSocket 实时推送
- 邮件通知
- Webhook 回调
- 消息队列

### 6.3 CleanupService

```python
class CleanupService:
    def cleanup_directory(directory_path) -> bool
    def cleanup_file(file_path) -> bool
```

清理策略：
- 任务成功：清理所有临时文件
- 任务失败：清理所有临时文件
- 任务中止：清理所有临时文件

### 6.4 TaskControlService

```python
class TaskControlService:
    def abort_scan(scan_id, terminate=True) -> bool
    def revoke_task(task_id, terminate=True) -> bool
    def get_task_status(task_id) -> str
```

---

## 七、配置示例

### 7.1 Celery 配置

```python
# config/celery.py

# 启用任务事件（用于监控）
CELERY_TASK_SEND_SENT_EVENT = True
CELERY_TASK_TRACK_STARTED = True

# Result Backend（用于存储任务结果和状态）
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_RESULT_EXTENDED = True

# 任务超时设置
CELERY_TASK_TIME_LIMIT = 3600  # 1小时硬超时
CELERY_TASK_SOFT_TIME_LIMIT = 3000  # 50分钟软超时
```

---

## 八、优势总结

### ✅ 解耦后的优势

1. **代码简洁**：任务代码从 180 行减少到 30 行
2. **职责清晰**：每个组件只负责一件事
3. **易于测试**：业务逻辑可独立测试
4. **易于维护**：修改状态/通知逻辑不影响任务代码
5. **易于扩展**：添加新处理器（如审计日志）无需改动任务
6. **全局复用**：所有任务共享同一套处理器

### ✅ 是否需要 celery.Task 基类？

**在解耦架构下不需要**

- ❌ 不需要自定义 Task 基类
- ❌ 不需要 bind=True
- ❌ 不需要生命周期钩子
- ✅ 只需要 `@shared_task` 装饰器
- ✅ 信号机制完全替代 Task 基类

---

## 九、下一步实现

### 实现步骤

1. ✅ 创建服务层（4个服务类）
2. ✅ 创建信号处理器（4个处理器）
3. ✅ 注册信号（apps.py）
4. ✅ 简化任务代码（移除状态/通知/清理逻辑）
5. ✅ 实现任务控制 API（中止接口）
6. ✅ 添加单元测试

### 测试重点

- 信号是否正确触发
- 状态更新是否及时
- 通知是否发送成功
- 资源清理是否完整
- 任务中止是否生效

---

## 十、参考资料

- [Celery Signals 官方文档](https://docs.celeryproject.org/en/stable/userguide/signals.html)
- [Django Signals 文档](https://docs.djangoproject.com/en/stable/topics/signals/)
- [事件驱动架构模式](https://www.martinfowler.com/articles/201701-event-driven.html)
