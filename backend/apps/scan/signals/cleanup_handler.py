"""
清理处理器

负责监听任务信号并清理资源
"""

import logging

from apps.scan.services import CleanupService
from apps.scan.models import Scan

logger = logging.getLogger(__name__)


class CleanupHandler:
    """清理处理器"""
    
    def __init__(self):
        self.cleanup_service = CleanupService()
    
    def on_task_postrun(
        self, 
        sender=None, 
        task_id=None, 
        task=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        retval=None,  # pylint: disable=unused-argument
        state=None,
        **extra  # pylint: disable=unused-argument
    ):
        """
        任务结束后清理资源（无论成功/失败/中止）
        
        ⚠️ 当前策略：仅记录日志，不实际清理
        
        原因：
        - 工作空间目录包含多个子任务的结果
        - 在单个子任务结束时清理会删除其他子任务的数据
        - 应该在整个扫描完成后统一清理工作空间
        
        未来优化：
        - 在 check_scan_completion() 中，扫描完成后清理整个工作空间
        - 或者提供手动清理 API
        
        信号：task_postrun
        触发时机：任务执行后（总是触发）
        """
        task_name = task.name if task else sender.name if sender else 'unknown'
        scan_id = kwargs.get('scan_id') if kwargs else None
        
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过清理")
            return
        
        logger.info(
            "任务结束 - Task: %s, Task ID: %s, Scan ID: %s, State: %s (暂不清理)",
            task_name,
            task_id,
            scan_id,
            state
        )
        
        # TODO: 未来在扫描完成后统一清理工作空间
        # 当前不清理，避免删除其他子任务的结果

