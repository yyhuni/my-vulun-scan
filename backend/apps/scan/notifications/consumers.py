"""
WebSocket Consumer - 通知实时推送
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    通知 WebSocket Consumer
    
    处理客户端连接、断开和通知推送
    使用 Redis Channel Layer 订阅通知
    """
    
    async def connect(self):
        """
        客户端连接时调用
        加入通知广播组
        """
        # 通知组名（所有客户端共享）
        self.group_name = 'notifications'
        
        # 加入组
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        # 接受 WebSocket 连接
        await self.accept()
        
        # 发送连接成功消息
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'message': '连接成功'
        }, ensure_ascii=False))
        
        logger.info(f"WebSocket 连接已建立 - Channel: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """
        客户端断开时调用
        离开通知广播组
        """
        # 离开组
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        
        logger.info(f"WebSocket 连接已断开 - Channel: {self.channel_name}, Code: {close_code}")
    
    async def receive(self, text_data):
        """
        接收客户端消息
        当前实现不需要处理客户端消息，保留以备扩展
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # 心跳响应
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'message': '心跳响应'
                }, ensure_ascii=False))
                logger.debug(f"心跳响应 - Channel: {self.channel_name}")
                
        except json.JSONDecodeError as e:
            logger.warning(f"解析客户端消息失败 - Channel: {self.channel_name}: {e}")
        except Exception as e:
            logger.error(f"处理客户端消息异常 - Channel: {self.channel_name}: {e}", exc_info=True)
    
    async def notification_message(self, event):
        """
        接收来自 Channel Layer 的通知消息
        转发给 WebSocket 客户端
        
        Args:
            event: 消息事件，包含通知数据
        """
        try:
            # 构造发送给客户端的消息
            message = {
                'type': 'notification',
                'id': event['id'],
                'title': event['title'],
                'message': event['message'],
                'level': event['level'],
                'created_at': event['created_at']
            }
            
            # 发送给客户端
            await self.send(text_data=json.dumps(message, ensure_ascii=False))
            
            logger.debug(f"通知已推送 - Channel: {self.channel_name}, ID: {event['id']}")
            
        except Exception as e:
            logger.error(f"推送通知失败 - Channel: {self.channel_name}: {e}", exc_info=True)
