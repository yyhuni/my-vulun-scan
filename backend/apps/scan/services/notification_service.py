"""
通知服务

负责发送扫描任务相关的通知
当前实现：仅记录日志（为后续扩展 WebSocket/邮件/Webhook 预留接口）
"""

import logging
from typing import Optional, Any, Dict

logger = logging.getLogger(__name__)


class NotificationService:
    """通知服务"""
    
    # 支持的事件类型
    EVENT_TYPES = {
        'task_started': '任务开始',
        'task_completed': '任务完成',
        'task_failed': '任务失败',
        'task_revoked': '任务中止',
        'task_retry': '任务重试',
    }
    
    def send(
        self,
        scan_id: int,
        event_type: str,
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        发送通知
        
        Args:
            scan_id: 扫描任务 ID
            event_type: 事件类型（task_started, task_completed, task_failed, task_revoked）
            message: 通知消息
            data: 附加数据（可选）
        
        Returns:
            是否发送成功
        """
        # 验证事件类型
        if event_type not in self.EVENT_TYPES:
            logger.warning(
                "未知的事件类型: %s, Scan ID: %s", 
                event_type, 
                scan_id
            )
            return False
        
        try:
            # 当前实现：仅记录日志
            event_label = self.EVENT_TYPES[event_type]
            logger.info(
                "[通知] Scan ID: %s | 事件: %s | 消息: %s | 数据: %s",
                scan_id,
                event_label,
                message,
                data or {}
            )
            
            # TODO: 后续扩展实现
            # - WebSocket 实时推送
            # - 邮件通知
            # - Webhook 回调
            # - 消息队列发布
            
            return True
            
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "发送通知失败 - Scan ID: %s, 事件: %s, 错误: %s",
                scan_id,
                event_type,
                e
            )
            return False
    
    def send_task_started(
        self, 
        scan_id: int, 
        task_name: str, 
        task_id: str
    ) -> bool:
        """
        发送任务开始通知
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            task_id: Celery 任务 ID
        
        Returns:
            是否发送成功
        """
        return self.send(
            scan_id=scan_id,
            event_type='task_started',
            message=f'任务 {task_name} 已开始执行',
            data={'task_name': task_name, 'task_id': task_id}
        )
    
    def send_task_completed(
        self, 
        scan_id: int, 
        task_name: str, 
        result: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        发送任务完成通知
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            result: 任务结果（可选）
        
        Returns:
            是否发送成功
        """
        return self.send(
            scan_id=scan_id,
            event_type='task_completed',
            message=f'任务 {task_name} 已成功完成',
            data={'task_name': task_name, 'result': result}
        )
    
    def send_task_failed(
        self, 
        scan_id: int, 
        task_name: str, 
        error_message: str
    ) -> bool:
        """
        发送任务失败通知
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            error_message: 错误消息
        
        Returns:
            是否发送成功
        """
        return self.send(
            scan_id=scan_id,
            event_type='task_failed',
            message=f'任务 {task_name} 执行失败',
            data={'task_name': task_name, 'error': error_message}
        )
    
    def send_task_revoked(
        self, 
        scan_id: int, 
        task_name: str, 
        reason: Optional[str] = None
    ) -> bool:
        """
        发送任务中止通知
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            reason: 中止原因（可选）
        
        Returns:
            是否发送成功
        """
        return self.send(
            scan_id=scan_id,
            event_type='task_revoked',
            message=f'任务 {task_name} 已被中止',
            data={'task_name': task_name, 'reason': reason}
        )

