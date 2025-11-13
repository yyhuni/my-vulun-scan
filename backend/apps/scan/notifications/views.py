"""
通知 SSE 视图
"""

import json
import logging
import time
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["GET"])
def notifications_sse(request):
    """
    SSE 实时通知推送 - 使用 Redis 订阅
    """
    logger.info("SSE 连接请求开始处理")
    
    def event_stream():
        try:
            logger.info("事件流生成器开始执行")
            
            import redis
            from django.conf import settings
            
            # Redis 配置
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
            logger.info("Redis 连接成功")
            
            # 发送连接成功消息
            yield f"data: {json.dumps({'type': 'connected', 'message': '连接成功'}, ensure_ascii=False)}\n\n"
            logger.info("已发送连接成功消息")
            
            # 订阅通知频道
            pubsub = redis_client.pubsub()
            pubsub.subscribe('notifications')
            logger.info("已订阅通知频道")
            
            # 监听消息
            heartbeat_interval = getattr(settings, 'SSE_HEARTBEAT_INTERVAL', 15)
            last_heartbeat = time.monotonic()
            logger.debug(f"SSE 心跳间隔: {heartbeat_interval}s")

            while True:
                try:
                    message = pubsub.get_message(timeout=1)
                except redis.exceptions.TimeoutError:
                    # Redis 会在 socket_timeout 到期时抛出超时，忽略并继续
                    message = None
                
                if message:
                    if message['type'] == 'message':
                        try:
                            # 解析通知数据
                            notification_data = json.loads(message['data'])
                            
                            # 构造 SSE 消息（保留通知字段在顶层，便于前端解析）
                            sse_data = {
                                'type': 'notification',
                                **notification_data
                            }
                            
                            yield f"data: {json.dumps(sse_data, ensure_ascii=False)}\n\n"
                            logger.info(f"已推送通知 - ID: {notification_data.get('id')}")
                            last_heartbeat = time.monotonic()
                            
                        except json.JSONDecodeError as e:
                            logger.error(f"解析通知数据失败: {e}")
                            continue
                            
                    elif message['type'] == 'subscribe':
                        logger.info(f"订阅成功 - 频道: {message['channel']}")
                        last_heartbeat = time.monotonic()

                # 无论是否收到通知，周期性发送心跳，避免客户端超时
                now = time.monotonic()
                if now - last_heartbeat >= heartbeat_interval:
                    heartbeat_payload = {
                        'type': 'heartbeat',
                        'message': '保持连接'
                    }
                    yield f"data: {json.dumps(heartbeat_payload, ensure_ascii=False)}\n\n"
                    last_heartbeat = now
                    
        except ImportError:
            logger.error("Redis 模块未安装")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Redis 模块未安装'}, ensure_ascii=False)}\n\n"
            
        except redis.ConnectionError as e:
            logger.error(f"Redis 连接失败: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Redis 连接失败'}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            logger.error(f"事件流生成器异常: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
    
    try:
        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['Access-Control-Allow-Origin'] = '*'
        # 注意：Django 开发服务器不允许设置 Connection 头部
        
        logger.info("SSE 响应创建成功")
        return response
        
    except Exception as e:
        logger.error(f"创建 SSE 响应失败: {e}", exc_info=True)
        from django.http import JsonResponse
        return JsonResponse({
            'error': f'SSE 服务启动失败: {str(e)}'
        }, status=500)


def notifications_test(request):
    """
    测试通知推送
    """
    try:
        from .services import create_notification
        from .types import NotificationLevel
        
        # 创建测试通知
        notification = create_notification(
            title="测试通知",
            message="这是一条测试通知消息",
            level=NotificationLevel.LOW
        )
        
        from django.http import JsonResponse
        return JsonResponse({
            'success': True,
            'message': '测试通知已发送',
            'notification_id': notification.id
        })
        
    except Exception as e:
        logger.error(f"发送测试通知失败: {e}")
        from django.http import JsonResponse
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
