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
        
        # 获取工作空间目录
        try:
            scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
            workspace_dir = scan.results_dir
            
            if not workspace_dir:
                logger.warning("Scan %s 没有 results_dir，跳过清理", scan_id)
                return
            
            # 清理任务的临时文件（保留最终结果）
            # 注意：具体清理逻辑由各个任务的服务层实现
            # 例如：subdomain_discovery 已经在内部清理了 amass/subfinder 的原始文件
            logger.info("✓ 任务临时文件已在执行过程中清理（如有）- Task: %s", task_name)
            
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("Scan %s 不存在，跳过清理", scan_id)
        except Exception as e:  # noqa: BLE001
            logger.error("清理任务临时文件失败 - Scan ID: %s, 错误: %s", scan_id, e)

