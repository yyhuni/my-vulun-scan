"""
ScanTask 模型数据访问层

负责 ScanTask 模型的所有数据库操作
"""

import logging
from typing import Optional, List, Dict
from collections import Counter

from django.db import transaction
from django.db.models import QuerySet

from apps.scan.models import Scan, ScanTask
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class ScanTaskRepository:
    """ScanTask 数据访问层"""
    
    # ==================== 基础 CRUD 操作 ====================
    
    @staticmethod
    def get_by_id(task_id: int) -> Optional[ScanTask]:
        """
        根据 ID 获取扫描任务记录
        
        Args:
            task_id: 任务记录 ID
        
        Returns:
            ScanTask 对象或 None
        """
        try:
            return ScanTask.objects.get(id=task_id)  # type: ignore  # pylint: disable=no-member
        except ScanTask.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("ScanTask 不存在 - Task ID: %s", task_id)
            return None
    
    @staticmethod
    def create(
        scan: Scan,
        name: str,
        task_id: str,
        status: ScanTaskStatus = ScanTaskStatus.INITIATED,
        description: str = '',
        error_message: str = '',
        error_traceback: str = ''
    ) -> ScanTask:
        """
        创建扫描任务记录
        
        Args:
            scan: 所属扫描任务
            name: 任务名称
            task_id: Celery 任务 ID
            status: 任务状态
            description: 任务描述
            error_message: 错误消息
            error_traceback: 错误堆栈
        
        Returns:
            创建的 ScanTask 对象
        """
        scan_task = ScanTask(
            scan=scan,
            name=name,
            task_id=task_id,
            status=status,
            description=description,
            error_message=error_message[:300] if error_message else '',
            error_traceback=error_traceback
        )
        scan_task.save()
        logger.debug("创建 ScanTask - ID: %s, 名称: %s", scan_task.id, name)
        return scan_task
    
    @staticmethod
    def update_or_create(
        scan: Scan,
        task_id: str,
        defaults: Dict
    ) -> tuple[ScanTask, bool]:
        """
        更新或创建扫描任务记录
        
        Args:
            scan: 所属扫描任务
            task_id: Celery 任务 ID
            defaults: 要更新的字段
        
        Returns:
            (ScanTask 对象, 是否新创建)
        """
        # 限制 error_message 长度
        if 'error_message' in defaults and defaults['error_message']:
            defaults['error_message'] = defaults['error_message'][:300]
        
        scan_task, created = ScanTask.objects.update_or_create(  # type: ignore  # pylint: disable=no-member
            scan=scan,
            task_id=task_id,
            defaults=defaults
        )
        
        action = "创建" if created else "更新"
        logger.debug(
            "%s ScanTask - ID: %s, Task ID: %s",
            action,
            scan_task.id,
            task_id
        )
        return scan_task, created
    
    @staticmethod
    def save(scan_task: ScanTask) -> ScanTask:
        """
        保存扫描任务记录
        
        Args:
            scan_task: ScanTask 对象
        
        Returns:
            保存后的 ScanTask 对象
        """
        scan_task.save()
        return scan_task
    
    @staticmethod
    def delete(task_id: int) -> bool:
        """
        删除扫描任务记录
        
        Args:
            task_id: 任务记录 ID
        
        Returns:
            是否删除成功
        """
        try:
            scan_task = ScanTask.objects.get(id=task_id)  # type: ignore  # pylint: disable=no-member
            scan_task.delete()
            logger.info("删除 ScanTask - ID: %s", task_id)
            return True
        except ScanTask.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("ScanTask 不存在 - Task ID: %s", task_id)
            return False
    
    # ==================== 查询操作 ====================
    
    @staticmethod
    def get_all() -> QuerySet[ScanTask]:
        """
        获取所有扫描任务记录
        
        Returns:
            ScanTask QuerySet
        """
        return ScanTask.objects.all()  # type: ignore  # pylint: disable=no-member
    
    @staticmethod
    def filter_by_scan(scan_id: int) -> QuerySet[ScanTask]:
        """
        根据扫描任务筛选任务记录
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            ScanTask QuerySet
        """
        return ScanTask.objects.filter(scan_id=scan_id)  # type: ignore  # pylint: disable=no-member
    
    @staticmethod
    def get_list_by_scan(scan_id: int) -> List[ScanTask]:
        """
        获取指定扫描任务的所有任务记录（列表形式）
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            ScanTask 对象列表
        """
        return list(ScanTaskRepository.filter_by_scan(scan_id))
    
    @staticmethod
    def filter_by_status(status: ScanTaskStatus) -> QuerySet[ScanTask]:
        """
        根据状态筛选任务记录
        
        Args:
            status: 任务状态
        
        Returns:
            ScanTask QuerySet
        """
        return ScanTask.objects.filter(status=status)  # type: ignore  # pylint: disable=no-member
    
    @staticmethod
    def filter_by_scan_and_status(scan_id: int, status: ScanTaskStatus) -> QuerySet[ScanTask]:
        """
        根据扫描任务和状态筛选任务记录
        
        Args:
            scan_id: 扫描任务 ID
            status: 任务状态
        
        Returns:
            ScanTask QuerySet
        """
        return ScanTask.objects.filter(scan_id=scan_id, status=status)  # type: ignore  # pylint: disable=no-member
    
    # ==================== 状态更新操作 ====================
    
    @staticmethod
    @transaction.atomic
    def update_status(
        task_id: int,
        status: ScanTaskStatus,
        error_message: Optional[str] = None,
        error_traceback: Optional[str] = None
    ) -> bool:
        """
        更新任务状态
        
        Args:
            task_id: 任务记录 ID
            status: 新状态
            error_message: 错误消息（可选）
            error_traceback: 错误堆栈（可选）
        
        Returns:
            是否更新成功
        """
        scan_task = ScanTaskRepository.get_by_id(task_id)
        if not scan_task:
            return False
        
        scan_task.status = status
        
        if error_message:
            scan_task.error_message = error_message[:300]
        
        if error_traceback:
            scan_task.error_traceback = error_traceback
        
        scan_task.save()
        logger.debug(
            "更新 ScanTask 状态 - ID: %s, 状态: %s",
            task_id,
            ScanTaskStatus(status).label
        )
        return True
    
    # ==================== 统计操作 ====================
    
    @staticmethod
    def count_by_scan(scan_id: int) -> int:
        """
        统计指定扫描任务的任务数量
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            任务数量
        """
        return ScanTaskRepository.filter_by_scan(scan_id).count()
    
    @staticmethod
    def count_by_scan_and_status(scan_id: int, status: ScanTaskStatus) -> int:
        """
        统计指定扫描任务和状态的任务数量
        
        Args:
            scan_id: 扫描任务 ID
            status: 任务状态
        
        Returns:
            任务数量
        """
        return ScanTaskRepository.filter_by_scan_and_status(scan_id, status).count()
    
    @staticmethod
    def get_status_statistics(scan_id: int) -> Dict[str, int]:
        """
        获取指定扫描任务的状态统计信息
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            状态统计字典，格式:
            {
                'total': 总任务数,
                'successful': 成功数,
                'failed': 失败数,
                'aborted': 中止数,
                'running': 运行中数量
            }
        """
        tasks = ScanTaskRepository.get_list_by_scan(scan_id)
        
        if not tasks:
            return {'total': 0}
        
        # 统计各状态的任务数量
        status_counts = Counter(task.status for task in tasks)
        
        stats = {
            'total': len(tasks),
            'successful': status_counts.get(ScanTaskStatus.SUCCESSFUL, 0),
            'failed': status_counts.get(ScanTaskStatus.FAILED, 0),
            'aborted': status_counts.get(ScanTaskStatus.ABORTED, 0),
            'running': sum(
                count for status, count in status_counts.items()
                if status not in [
                    ScanTaskStatus.SUCCESSFUL,
                    ScanTaskStatus.FAILED,
                    ScanTaskStatus.ABORTED
                ]
            )
        }
        
        return stats
    
    @staticmethod
    def check_all_completed(scan_id: int) -> tuple[bool, Dict[str, int]]:
        """
        检查扫描任务的所有子任务是否完成
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            (是否全部完成, 状态统计字典)
        """
        tasks = ScanTaskRepository.get_list_by_scan(scan_id)
        
        if not tasks:
            logger.debug("Scan %s 没有子任务记录", scan_id)
            return False, {'total': 0}
        
        # 获取统计信息
        stats = ScanTaskRepository.get_status_statistics(scan_id)
        
        # 检查是否所有任务都完成
        all_completed = all(
            task.status in [
                ScanTaskStatus.SUCCESSFUL,
                ScanTaskStatus.FAILED,
                ScanTaskStatus.ABORTED
            ]
            for task in tasks
        )
        
        return all_completed, stats


# 导出接口
__all__ = ['ScanTaskRepository']

