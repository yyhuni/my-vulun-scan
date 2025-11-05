"""
扫描子任务管理服务

负责 ScanTask 模型的 CRUD 操作
"""

import logging
from typing import Optional, List, Dict

from apps.scan.repositories import ScanRepository, ScanTaskRepository
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class ScanTaskService:
    """扫描子任务管理服务"""
    
    def __init__(
        self,
        scan_repository: Optional[ScanRepository] = None,
        scan_task_repository: Optional[ScanTaskRepository] = None
    ):
        """
        初始化服务
        
        Args:
            scan_repository: ScanRepository 实例（用于依赖注入）
            scan_task_repository: ScanTaskRepository 实例（用于依赖注入）
        """
        self.scan_repo = scan_repository or ScanRepository()
        self.scan_task_repo = scan_task_repository or ScanTaskRepository()
    
    def update_task_status(
        self,
        scan_id: int,
        task_name: str,
        task_id: str,
        status: ScanTaskStatus,
        error_message: Optional[str] = None,
        error_traceback: Optional[str] = None
    ) -> bool:
        """
        更新或创建 ScanTask 状态
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            task_id: Celery 任务 ID
            status: 任务状态
            error_message: 错误消息（可选）
            error_traceback: 错误堆栈（可选）
        
        Returns:
            是否更新成功
        """
        try:
            # 获取 Scan 对象
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                return False
            
            # 更新或创建 ScanTask
            _scan_task, created = self.scan_task_repo.update_or_create(
                scan=scan,
                task_id=task_id,
                defaults={
                    'name': task_name,
                    'status': status,
                    'error_message': error_message or '',
                    'error_traceback': error_traceback or '',
                }
            )
            
            action = "创建" if created else "更新"
            logger.info(
                "%s ScanTask - Scan ID: %s, Task: %s, 状态: %s",
                action,
                scan_id,
                task_name,
                ScanTaskStatus(status).label
            )
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "更新 ScanTask 状态失败 - Scan ID: %s, Task: %s, 错误: %s",
                scan_id,
                task_name,
                e
            )
            return False
    
    def get_tasks_by_scan(self, scan_id: int) -> List:
        """
        获取指定扫描的所有子任务
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            ScanTask 对象列表
        """
        try:
            return self.scan_task_repo.get_list_by_scan(scan_id)
        except Exception as e:  # noqa: BLE001
            logger.exception("获取 ScanTask 列表失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return []
    
    def check_all_tasks_completed(self, scan_id: int) -> tuple[bool, Dict[str, int]]:
        """
        检查扫描的所有子任务是否完成，并返回统计信息
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            (是否全部完成, 状态统计字典)
            状态统计字典格式: {
                'total': 总任务数,
                'successful': 成功数,
                'failed': 失败数,
                'aborted': 中止数,
                'running': 运行中数量
            }
        """
        try:
            return self.scan_task_repo.check_all_completed(scan_id)
        except Exception as e:  # noqa: BLE001
            logger.exception("检查任务完成状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False, {'total': 0}


# 导出接口
__all__ = ['ScanTaskService']

