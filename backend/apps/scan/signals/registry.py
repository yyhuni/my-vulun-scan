"""
信号注册模块

在 Django 应用启动时注册所有 Celery 任务信号处理器
"""

import logging
from celery.signals import (
    task_prerun, 
    task_postrun, 
    task_success, 
    task_failure, 
    task_revoked
)

from .status_update_handler import StatusUpdateHandler
from .notification_handler import NotificationHandler
from .cleanup_handler import CleanupHandler

logger = logging.getLogger(__name__)


def register_all_signals():
    """
    注册所有信号处理器
    
    在 Django App 的 ready() 方法中调用，确保信号在应用启动时注册
    """
    logger.info("开始注册 Celery 任务信号处理器...")
    
    # 实例化处理器
    status_handler = StatusUpdateHandler()
    notification_handler = NotificationHandler()
    cleanup_handler = CleanupHandler()
    
    # 注册状态更新处理器
    task_prerun.connect(status_handler.on_task_prerun, weak=False)
    task_success.connect(status_handler.on_task_success, weak=False)
    task_failure.connect(status_handler.on_task_failure, weak=False)
    task_revoked.connect(status_handler.on_task_revoked, weak=False)
    logger.info("✓ StatusUpdateHandler 已注册")
    
    # 注册通知处理器
    task_prerun.connect(notification_handler.on_task_prerun, weak=False)
    task_success.connect(notification_handler.on_task_success, weak=False)
    task_failure.connect(notification_handler.on_task_failure, weak=False)
    task_revoked.connect(notification_handler.on_task_revoked, weak=False)
    logger.info("✓ NotificationHandler 已注册")
    
    # 注册清理处理器
    task_postrun.connect(cleanup_handler.on_task_postrun, weak=False)
    logger.info("✓ CleanupHandler 已注册")
    
    logger.info("所有信号处理器注册完成！")

