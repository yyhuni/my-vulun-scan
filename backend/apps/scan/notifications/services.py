"""通知服务 - 支持数据库存储和 SSE 实时推送"""

import logging
import json
from .models import Notification
from .types import NotificationLevel

logger = logging.getLogger(__name__)


def create_notification(
    title: str,
    message: str,
    level: NotificationLevel = NotificationLevel.LOW
) -> Notification:
    """
    创建通知记录并实时推送
    """
    try:
        # 1. 写入数据库
        notification = Notification.objects.create(
            level=level,
            title=title,
            message=message
        )
        
        # 2. SSE 实时推送
        _push_to_sse(notification)
        
        logger.info(f"通知已创建并推送 - {title}")
        return notification
        
    except Exception as e:
        logger.error(f"创建通知失败 - {title}: {e}")
        raise


def _push_to_sse(notification: Notification) -> None:
    """
    推送通知到 SSE 频道
    """
    try:
        logger.info(f"开始推送通知到 SSE - ID: {notification.id}")
        
        import redis
        from django.conf import settings
        
        redis_host = getattr(settings, 'REDIS_HOST', 'localhost')
        redis_port = getattr(settings, 'REDIS_PORT', 6379)
        redis_db = getattr(settings, 'REDIS_DB', 0)
        
        logger.debug(f"连接 Redis: {redis_host}:{redis_port}/{redis_db}")
        
        redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            db=redis_db,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # 测试连接
        redis_client.ping()
        logger.debug("Redis 连接测试成功")
        
        # 构造通知数据
        data = {
            'id': notification.id,
            'title': notification.title,
            'message': notification.message,
            'level': notification.level,
            'created_at': notification.created_at.isoformat()
        }
        
        # 发布到 SSE 频道
        message = json.dumps(data, ensure_ascii=False)
        result = redis_client.publish('notifications', message)
        
        logger.info(f"通知推送成功 - ID: {notification.id}, 订阅者数量: {result}")
        
    except ImportError as e:
        logger.warning(f"Redis 模块未安装，跳过 SSE 推送: {e}")
    except Exception as e:
        logger.warning(f"SSE 推送失败 - ID: {notification.id}: {e}", exc_info=True)
