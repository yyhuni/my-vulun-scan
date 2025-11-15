"""通知服务 - 支持数据库存储和 SSE 实时推送"""

import logging
import json
import time
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
    
    增强的重试机制：
    - 最多重试 3 次
    - 每次重试前强制关闭并重建数据库连接
    - 重试间隔：1秒 → 2秒 → 3秒
    - 针对连接错误进行特殊处理
    
    Args:
        title: 通知标题
        message: 通知消息
        level: 通知级别
        
    Returns:
        Notification: 创建的通知对象
        
    Raises:
        Exception: 重试3次后仍然失败
    """
    from django.db import connection
    from psycopg2 import OperationalError, InterfaceError
    
    max_retries = 3
    last_exception = None
    
    for attempt in range(1, max_retries + 1):
        try:
            # 强制关闭旧连接并重建（每次尝试都重建）
            if attempt > 1:
                logger.debug(f"重试创建通知 ({attempt}/{max_retries}) - {title}")
            
            connection.close()
            connection.ensure_connection()
            
            # 测试连接是否真的可用
            connection.cursor().execute("SELECT 1")
            
            # 1. 写入数据库
            notification = Notification.objects.create(
                level=level,
                title=title,
                message=message
            )
            
            # 2. SSE 实时推送（推送失败不影响通知创建）
            try:
                _push_to_sse(notification)
            except Exception as push_error:
                logger.warning(f"SSE 推送失败，但通知已创建 - {title}: {push_error}")
            
            if attempt > 1:
                logger.info(f"✓ 通知创建成功（重试 {attempt-1} 次后） - {title}")
            else:
                logger.debug(f"通知已创建并推送 - {title}")
            
            return notification
            
        except (OperationalError, InterfaceError) as e:
            # 数据库连接错误，需要重试
            last_exception = e
            error_msg = str(e)
            logger.warning(
                f"数据库连接错误 ({attempt}/{max_retries}) - {title}: {error_msg[:100]}"
            )
            
            if attempt < max_retries:
                # 指数退避：1秒、2秒、3秒
                sleep_time = attempt
                logger.debug(f"等待 {sleep_time} 秒后重试...")
                time.sleep(sleep_time)
            else:
                logger.error(
                    f"创建通知失败 - 数据库连接问题（已重试 {max_retries} 次） - {title}: {error_msg}"
                )
                
        except Exception as e:
            # 其他错误，不重试直接抛出
            last_exception = e
            error_str = str(e).lower()
            
            if 'connection' in error_str or 'closed' in error_str:
                logger.error(f"创建通知失败 - 连接相关错误 - {title}: {e}")
            else:
                logger.error(f"创建通知失败 - {title}: {e}")
            
            # 非连接错误，直接抛出不重试
            raise
    
    # 所有重试都失败了
    error_msg = f"创建通知失败 - 已重试 {max_retries} 次仍然失败 - {title}"
    logger.error(error_msg)
    raise RuntimeError(error_msg) from last_exception


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
