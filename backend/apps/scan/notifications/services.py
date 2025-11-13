"""极简通知服务"""

import logging
from .models import Notification
from .types import NotificationLevel

logger = logging.getLogger(__name__)


def create_notification(
    title: str,
    message: str,
    level: NotificationLevel = NotificationLevel.INFO
) -> Notification:
    """
    创建通知记录
    
    Args:
        title: 通知标题
        message: 通知消息
        level: 通知级别
    
    Returns:
        Notification: 创建的通知对象
    """
    try:
        notification = Notification.objects.create(
            level=level,
            title=title,
            message=message
        )
        
        logger.info(f"通知已创建 - {title}")
        return notification
        
    except Exception as e:
        logger.error(f"创建通知失败 - {title}: {e}")
        raise
