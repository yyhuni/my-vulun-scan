"""通知服务 - 支持数据库存储和 SSE 实时推送"""

import logging
import json
from typing import Generator, Optional
from .models import Notification
from .types import NotificationLevel

logger = logging.getLogger(__name__)


def get_redis_client():
    """
    获取 Redis 客户端实例
    """
    try:
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
        return redis_client
        
    except ImportError as e:
        logger.error(f"Redis 模块未安装: {e}")
        raise
    except Exception as e:
        logger.error(f"Redis 连接失败: {e}")
        raise


def create_notification(
    title: str,
    message: str,
    level: NotificationLevel = NotificationLevel.LOW
) -> Notification:
    """
    创建通知记录并实时推送
    """
    try:
        # 数据库连接健康检查
        from django.db import connection
        try:
            connection.ensure_connection()
        except Exception as conn_e:
            logger.warning(f"数据库连接检查失败，重新建立连接: {conn_e}")
            connection.close()
            connection.ensure_connection()
        
        # 1. 写入数据库
        notification = Notification.objects.create(
            level=level,
            title=title,
            message=message
        )
        
        # 2. SSE 实时推送
        _push_to_sse(notification)
        
        logger.debug(f"通知已创建并推送 - {title}")
        return notification
        
    except Exception as e:
        error_str = str(e).lower()
        if 'connection' in error_str:
            logger.error(f"创建通知失败 - 数据库连接问题 - {title}: {e}")
        else:
            logger.error(f"创建通知失败 - {title}: {e}")
        raise


def _push_to_sse(notification: Notification) -> None:
    """
    推送通知到 SSE 频道
    """
    try:
        logger.debug(f"开始推送通知到 SSE - ID: {notification.id}")
        
        redis_client = get_redis_client()
        
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
        
        logger.debug(f"通知推送成功 - ID: {notification.id}, 订阅者数量: {result}")
        
    except ImportError as e:
        logger.warning(f"Redis 模块未安装，跳过 SSE 推送: {e}")
    except Exception as e:
        logger.warning(f"SSE 推送失败 - ID: {notification.id}: {e}", exc_info=True)
