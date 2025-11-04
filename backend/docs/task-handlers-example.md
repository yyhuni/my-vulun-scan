# 信号处理器实现示例

## StatusUpdateHandler（状态更新）

```python
# backend/apps/scan/signals/handlers.py

import logging
from apps.scan.services.scan_status_service import ScanStatusService
from apps.common.definitions import CeleryTaskStatus

logger = logging.getLogger(__name__)


class StatusUpdateHandler:
    """状态更新处理器"""
    
    def __init__(self):
        self.status_service = ScanStatusService()
    
    def on_task_prerun(self, sender=None, task_id=None, task=None, args=None, kwargs=None, **extra):
        """任务开始前：更新为 RUNNING"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        self.status_service.update_status(scan_id, CeleryTaskStatus.RUNNING)
        self.status_service.update_task_status(scan_id, task.name, task_id, CeleryTaskStatus.RUNNING)
    
    def on_task_success(self, sender=None, result=None, task_id=None, args=None, kwargs=None, **extra):
        """任务成功：更新为 SUCCESSFUL"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        self.status_service.update_status(scan_id, CeleryTaskStatus.SUCCESSFUL)
    
    def on_task_failure(self, sender=None, task_id=None, exception=None, args=None, kwargs=None, **extra):
        """任务失败：更新为 FAILED"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        self.status_service.update_status(scan_id, CeleryTaskStatus.FAILED, str(exception)[:300])
```

## NotificationHandler（通知发送）

```python
class NotificationHandler:
    """通知处理器"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    def on_task_prerun(self, sender=None, task_id=None, task=None, args=None, kwargs=None, **extra):
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        self.notification_service.send(scan_id, 'task_started', f'{task.name} 开始')
    
    def on_task_success(self, sender=None, result=None, args=None, kwargs=None, **extra):
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        self.notification_service.send(scan_id, 'task_completed', f'{sender.name} 完成')
```

## CleanupHandler（资源清理）

```python
class CleanupHandler:
    """清理处理器"""
    
    def __init__(self):
        self.cleanup_service = CleanupService()
    
    def on_task_postrun(self, sender=None, task=None, args=None, kwargs=None, **extra):
        """任务结束后清理（无论成功/失败）"""
        results_dir = kwargs.get('results_dir') if kwargs else None
        if not results_dir:
            return
        
        self.cleanup_service.cleanup_directory(results_dir)
```

## 信号注册

```python
# backend/apps/scan/signals/registry.py

from celery.signals import task_prerun, task_postrun, task_success, task_failure, task_revoked
from .handlers import StatusUpdateHandler, NotificationHandler, CleanupHandler


def register_all_signals():
    """注册所有信号"""
    status_handler = StatusUpdateHandler()
    notification_handler = NotificationHandler()
    cleanup_handler = CleanupHandler()
    
    # 注册信号
    task_prerun.connect(status_handler.on_task_prerun, weak=False)
    task_success.connect(status_handler.on_task_success, weak=False)
    task_failure.connect(status_handler.on_task_failure, weak=False)
    task_revoked.connect(status_handler.on_task_revoked, weak=False)
    
    task_prerun.connect(notification_handler.on_task_prerun, weak=False)
    task_success.connect(notification_handler.on_task_success, weak=False)
    
    task_postrun.connect(cleanup_handler.on_task_postrun, weak=False)
```

## Django App 配置

```python
# backend/apps/scan/apps.py

class ScanConfig(AppConfig):
    name = 'apps.scan'
    
    def ready(self):
        from apps.scan.signals.registry import register_all_signals
        register_all_signals()
```
