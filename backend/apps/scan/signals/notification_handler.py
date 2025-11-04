"""
通知处理器

负责监听任务信号并发送相应的通知
"""

import logging

from apps.scan.services import NotificationService

logger = logging.getLogger(__name__)


class NotificationHandler:
    """通知处理器"""
    
    def __init__(self):
        self.notification_service = NotificationService()
    
    def on_task_prerun(
        self, 
        sender=None,  # pylint: disable=unused-argument
        task_id=None, 
        task=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        **extra  # pylint: disable=unused-argument
    ):
        """任务开始前发送通知"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        task_name = task.name if task else 'unknown'
        self.notification_service.send_task_started(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or ''
        )
    
    def on_task_success(
        self, 
        sender=None, 
        result=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        **extra  # pylint: disable=unused-argument
    ):
        """任务成功后发送通知"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        task_name = sender.name if sender else 'unknown'
        self.notification_service.send_task_completed(
            scan_id=scan_id,
            task_name=task_name,
            result=result if isinstance(result, dict) else None
        )
    
    def on_task_failure(
        self, 
        sender=None, 
        exception=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        **extra  # pylint: disable=unused-argument
    ):
        """任务失败后发送通知"""
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        task_name = sender.name if sender else 'unknown'
        error_message = str(exception) if exception else 'Unknown error'
        self.notification_service.send_task_failed(
            scan_id=scan_id,
            task_name=task_name,
            error_message=error_message
        )
    
    def on_task_revoked(
        self, 
        sender=None,  # pylint: disable=unused-argument
        request=None, 
        **extra  # pylint: disable=unused-argument
    ):
        """任务中止后发送通知"""
        if not request:
            return
        
        kwargs = request.kwargs if hasattr(request, 'kwargs') else {}
        task_name = request.task if hasattr(request, 'task') else 'unknown'
        
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            return
        
        self.notification_service.send_task_revoked(
            scan_id=scan_id,
            task_name=task_name,
            reason="任务被用户或系统中止"
        )

