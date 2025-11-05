"""
清理处理器

负责监听任务信号并清理资源
"""

import logging

from apps.scan.services import CleanupService

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
        任务结束后清理临时资源（无论成功/失败/中止）
        
        清理策略：
        1. 清理任务级别的临时文件（如工具生成的原始文件）
        2. 保留模块目录和最终合并文件（供后续使用）
        3. 整个工作空间在扫描完成后统一清理（由 check_scan_completion 触发）
        
        示例：
        - subdomain_discovery/ 
          ├── amass_xxx.txt      ← 删除（临时文件）
          ├── subfinder_xxx.txt  ← 删除（临时文件）
          └── merged_xxx.txt     ← 保留（最终结果）
        
        信号：task_postrun
        触发时机：任务执行后（总是触发，无论成功/失败/中止）
        """
        task_name = task.name if task else sender.name if sender else 'unknown'
        scan_id = kwargs.get('scan_id') if kwargs else None
        
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过清理")
            return
        
        logger.info(
            "任务结束清理 - Task: %s, Task ID: %s, Scan ID: %s, State: %s",
            task_name,
            task_id,
            scan_id,
            state
        )
        
        # 委托 CleanupService 处理清理逻辑
        # CleanupService 会处理所有相关逻辑：
        # - 获取 Scan 对象
        # - 检查 results_dir
        # - 执行清理操作
        self.cleanup_service.cleanup_scan_task_temp_files(scan_id)

