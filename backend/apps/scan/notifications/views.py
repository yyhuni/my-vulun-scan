"""
通知 SSE 视图
"""

import json
import logging
import time
from typing import Any
from django.conf import settings
from django.http import JsonResponse, StreamingHttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import BasePagination
from .models import Notification
from .serializers import NotificationSerializer
from .types import NotificationLevel

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
            
            from .services import get_redis_client
            import redis
            
            # 获取 Redis 客户端
            redis_client = get_redis_client()
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
                    
        except ImportError as e:
            logger.error(f"Redis 模块未安装: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Redis 模块未安装'}, ensure_ascii=False)}\n\n"
            
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
        from django.http import JsonResponse

        level_param = request.GET.get('level', NotificationLevel.LOW)
        try:
            level_choice = NotificationLevel(level_param)
        except ValueError:
            level_choice = NotificationLevel.LOW

        title = request.GET.get('title') or "测试通知"
        message = request.GET.get('message') or "这是一条测试通知消息"

        # 创建测试通知
        notification = create_notification(
            title=title,
            message=message,
            level=level_choice
        )
        
        return JsonResponse({
            'success': True,
            'message': '测试通知已发送',
            'notification_id': notification.id
        })
        
    except Exception as e:
        logger.error(f"发送测试通知失败: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


def build_api_response(
    data: Any = None,
    *,
    message: str = '操作成功',
    code: str = '200',
    state: str = 'success',
    status_code: int = status.HTTP_200_OK
) -> Response:
    """构建统一的 API 响应格式
    
    Args:
        data: 响应数据体（可选）
        message: 响应消息
        code: 响应代码
        state: 响应状态（success/error）
        status_code: HTTP 状态码
        
    Returns:
        DRF Response 对象
    """
    payload = {
        'code': code,
        'state': state,
        'message': message,
    }
    if data is not None:
        payload['data'] = data
    return Response(payload, status=status_code)


def _parse_bool(value: str | None) -> bool | None:
    """解析字符串为布尔值
    
    Args:
        value: 字符串值，支持 '1', 'true', 'yes' 为 True；'0', 'false', 'no' 为 False
        
    Returns:
        布尔值，或 None（如果无法解析）
    """
    if value is None:
        return None
    value = str(value).strip().lower()
    if value in {'1', 'true', 'yes'}:
        return True
    if value in {'0', 'false', 'no'}:
        return False
    return None



class NotificationCollectionView(APIView):
    """通知列表
    
    支持的方法：
    - GET: 获取通知列表（支持分页和过滤）
    """
    pagination_class = BasePagination

    def get(self, request: Request) -> Response:
        """
        获取通知列表
        
        URL: GET /api/notifications/?page=1&pageSize=20&level=info&unread=true
        
        查询参数:
        - page: 页码（默认 1）
        - pageSize: 每页数量（默认 10，最大 1000）
        - level: 通知级别过滤（low/medium/high）
        - unread: 是否未读（true/false）
        
        返回:
        - results: 通知列表
        - total: 总记录数
        - page: 当前页码
        - page_size: 每页大小
        - total_pages: 总页数
        """
        queryset = Notification.objects.all()

        # 按级别过滤
        level_param = request.query_params.get('level')
        if level_param in NotificationLevel.values:
            queryset = queryset.filter(level=level_param)

        # 按已读状态过滤
        # unread=true: 仅未读  unread=false: 仅已读  unread=None: 全部
        unread_param = _parse_bool(request.query_params.get('unread'))
        if unread_param is True:
            queryset = queryset.filter(is_read=False)
        elif unread_param is False:
            queryset = queryset.filter(is_read=True)
        # 当 unread_param is None 时，不过滤，返回所有通知

        queryset = queryset.order_by('-created_at')
        
        # 使用通用分页器
        paginator = self.pagination_class()
        page_obj = paginator.paginate_queryset(queryset, request)
        serializer = NotificationSerializer(page_obj, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationUnreadCountView(APIView):
    """获取未读通知数量
    
    URL: GET /api/notifications/unread-count/
    
    功能:
    - 返回当前未读通知的数量
    
    返回:
    - count: 未读通知数量
    """

    def get(self, request: Request) -> Response:
        """获取未读通知数量"""
        count = Notification.objects.filter(is_read=False).count()
        return build_api_response({'count': count}, message='获取未读数量成功')


class NotificationMarkAllAsReadView(APIView):
    """标记全部通知为已读
    
    URL: POST /api/notifications/mark-all-as-read/
    
    功能:
    - 将所有未读通知标记为已读
    - 更新 read_at 时间戳
    
    返回:
    - updated: 更新的通知数量
    """

    def post(self, request: Request) -> Response:
        """标记全部通知为已读"""
        updated = Notification.objects.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return build_api_response({'updated': updated}, message='全部标记已读成功')
