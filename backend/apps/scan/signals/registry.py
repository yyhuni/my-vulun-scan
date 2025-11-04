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


# 模块级单例：防止重复注册
_handlers_registered = False
_status_handler = None
_notification_handler = None
_cleanup_handler = None


def register_all_signals():
    """
    注册所有信号处理器
    
    在 Django App 的 ready() 方法中调用，确保信号在应用启动时注册
    
    特性：
    - 使用模块级标志位防止重复注册
    - 使用模块级单例存储处理器实例
    - 多次调用 ready() 时自动跳过
    """
    global _handlers_registered, _status_handler, _notification_handler, _cleanup_handler
    
    # 检查是否已注册
    if _handlers_registered:
        logger.warning("信号处理器已注册，跳过重复注册")
        return
    
    logger.info("开始注册 Celery 任务信号处理器...")
    
    # 创建单例处理器
    _status_handler = StatusUpdateHandler()
    _notification_handler = NotificationHandler()
    _cleanup_handler = CleanupHandler()
    
    # 注册状态更新处理器
    task_prerun.connect(_status_handler.on_task_prerun, weak=False)
    task_success.connect(_status_handler.on_task_success, weak=False)
    task_failure.connect(_status_handler.on_task_failure, weak=False)
    task_revoked.connect(_status_handler.on_task_revoked, weak=False)
    logger.info("✓ StatusUpdateHandler 已注册")
    
    # 注册通知处理器
    task_prerun.connect(_notification_handler.on_task_prerun, weak=False)
    task_success.connect(_notification_handler.on_task_success, weak=False)
    task_failure.connect(_notification_handler.on_task_failure, weak=False)
    task_revoked.connect(_notification_handler.on_task_revoked, weak=False)
    logger.info("✓ NotificationHandler 已注册")
    
    # 注册清理处理器
    task_postrun.connect(_cleanup_handler.on_task_postrun, weak=False)
    logger.info("✓ CleanupHandler 已注册")
    
    # 标记为已注册
    _handlers_registered = True
    logger.info("所有信号处理器注册完成！")

