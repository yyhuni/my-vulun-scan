"""
扫描子任务管理服务

负责 ScanTask 模型的 CRUD 操作
"""

from __future__ import annotations

import logging
from typing import List, Dict

from apps.scan.repositories import ScanRepository, ScanTaskRepository
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class ScanTaskService:
    """扫描子任务管理服务"""
    
    def __init__(
        self,
        scan_repository: ScanRepository | None = None,
        scan_task_repository: ScanTaskRepository | None = None
    ):
        """
        初始化服务
        
        Args:
            scan_repository: ScanRepository 实例（用于依赖注入）
            scan_task_repository: ScanTaskRepository 实例（用于依赖注入）
        """
        self.scan_repo = scan_repository or ScanRepository()
        self.scan_task_repo = scan_task_repository or ScanTaskRepository()
    
    def initialize_task(
        self,
        scan_id: int,
        task_name: str,
        task_id: str,
        status: ScanTaskStatus
    ) -> bool:
        """
        初始化 ScanTask 记录（任务开始时调用）
        
        职责：
        - 创建新的 ScanTask 记录
        - 设置初始状态（通常是 RUNNING）
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            task_id: Celery 任务 ID（不能为空）
            status: 任务状态（默认 RUNNING）
        
        Returns:
            是否初始化成功
        """
        try:
            # 验证参数（业务规则）
            if not task_id or not task_id.strip():
                logger.error(
                    "task_id 为空或无效 - Scan ID: %s, Task: %s, task_id: '%s'",
                    scan_id, task_name, task_id
                )
                return False
            
            if not task_name or not task_name.strip():
                logger.error(
                    "task_name 为空或无效 - Scan ID: %s, task_id: %s",
                    scan_id, task_id
                )
                return False
            
            # 获取 Scan 对象
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                return False
            
            # 创建 ScanTask
            _scan_task, created = self.scan_task_repo.update_or_create(
                scan=scan,
                task_id=task_id,
                defaults={
                    'name': task_name,
                    'status': status,
                    'error_message': '',
                    'error_traceback': '',
                }
            )
            
            if created:
                logger.info(
                    "初始化 ScanTask - Scan ID: %s, Task: %s, Task ID: %s, 状态: %s",
                    scan_id,
                    task_name,
                    task_id,
                    ScanTaskStatus(status).label
                )
            else:
                logger.warning(
                    "ScanTask 已存在 - Scan ID: %s, Task ID: %s, 跳过重复创建",
                    scan_id,
                    task_id
                )
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "初始化 ScanTask 失败 - Scan ID: %s, Task: %s, 错误: %s",
                scan_id,
                task_name,
                e
            )
            return False
    
    def update_task_status(
        self,
        scan_id: int,
        task_name: str,
        task_id: str,
        status: ScanTaskStatus,
        error_message: str | None = None,
        error_traceback: str | None = None
    ) -> bool:
        """
        更新 ScanTask 状态（任务完成/失败时调用）
        
        职责：
        - 更新已存在的 ScanTask 状态
        - 记录错误信息（如果有）
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            task_id: Celery 任务 ID（不能为空）
            status: 任务状态
            error_message: 错误消息（可选）
            error_traceback: 错误堆栈（可选）
        
        Returns:
            是否更新成功
        """
        try:
            # 验证参数（业务规则）
            if not task_id or not task_id.strip():
                logger.error(
                    "task_id 为空或无效 - Scan ID: %s, Task: %s, task_id: '%s'",
                    scan_id, task_name, task_id
                )
                return False
            
            if not task_name or not task_name.strip():
                logger.error(
                    "task_name 为空或无效 - Scan ID: %s, task_id: %s",
                    scan_id, task_id
                )
                return False
            
            # 获取 Scan 对象
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                return False
            
            # 更新 ScanTask
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
            
            if created:
                logger.warning(
                    "ScanTask 不存在，已自动创建 - Scan ID: %s, Task: %s",
                    scan_id,
                    task_name
                )
            
            logger.info(
                "更新 ScanTask 状态 - Scan ID: %s, Task: %s, 状态: %s",
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
    
    def get_running_tasks(self, scan_id: int) -> List[Dict[str, str]]:
        """
        获取指定 Scan 下所有可撤销的任务（RUNNING + INITIATED）
        
        Args:
            scan_id: 扫描 ID
        
        Returns:
            任务信息列表，格式:
            [
                {
                    'task_id': 'xxx', 
                    'task_name': 'subdomain_discovery',
                    'status': 'RUNNING'
                },
                {
                    'task_id': 'yyy', 
                    'task_name': 'port_scan',
                    'status': 'INITIATED'
                },
                ...
            ]
        
        Note:
            用于任务失败时撤销其他可撤销的任务
            - RUNNING: 正在执行，需要强制终止
            - INITIATED: 待执行（初始化），需要取消调度
        """
        try:
            return self.scan_task_repo.get_running_tasks(scan_id)
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "获取可撤销任务失败 - Scan ID: %s, 错误: %s",
                scan_id, e
            )
            return []
    
    def get_task_stats(
        self, 
        scan_id: int, 
        exclude_tasks: List[str] | None = None
    ) -> Dict[str, int]:
        """
        获取 ScanTask 的状态统计
        
        用于 finalize_scan_task 统计所有子任务的状态，决定 Scan 的最终状态
        
        Args:
            scan_id: 扫描 ID
            exclude_tasks: 要排除的任务名称列表（如 ['initiate_scan', 'finalize_scan']）
        
        Returns:
            {
                'total': int,         # 总任务数
                'running': int,       # 运行中
                'successful': int,    # 成功
                'failed': int,        # 失败
                'aborted': int,       # 中止
                'initiated': int      # 待执行（初始化）
            }
        
        示例：
            >>> service = ScanTaskService()
            >>> stats = service.get_task_stats(
            ...     scan_id=123,
            ...     exclude_tasks=['initiate_scan', 'finalize_scan']
            ... )
            >>> print(stats)
            {'total': 3, 'successful': 2, 'failed': 1, 'aborted': 0, 'running': 0, 'initiated': 0}
        """
        try:
            from django.db.models import Count, Q
            
            # 获取所有 ScanTask
            queryset = self.scan_task_repo.filter(scan_id=scan_id)
            
            # 排除指定任务
            if exclude_tasks:
                queryset = queryset.exclude(name__in=exclude_tasks)
            
            # 统计各状态数量
            stats = queryset.aggregate(
                total=Count('id'),
                running=Count('id', filter=Q(status=ScanTaskStatus.RUNNING)),
                successful=Count('id', filter=Q(status=ScanTaskStatus.SUCCESSFUL)),
                failed=Count('id', filter=Q(status=ScanTaskStatus.FAILED)),
                aborted=Count('id', filter=Q(status=ScanTaskStatus.ABORTED)),
                initiated=Count('id', filter=Q(status=ScanTaskStatus.INITIATED))
            )
            
            # 转换为标准格式（确保所有值都是 int，不是 None）
            return {
                'total': stats['total'] or 0,
                'running': stats['running'] or 0,
                'successful': stats['successful'] or 0,
                'failed': stats['failed'] or 0,
                'aborted': stats['aborted'] or 0,
                'initiated': stats['initiated'] or 0
            }
            
        except Exception as e:  # noqa: BLE001
            logger.exception("获取任务统计失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return {
                'total': 0,
                'running': 0,
                'successful': 0,
                'failed': 0,
                'aborted': 0,
                'initiated': 0
            }


# 导出接口
__all__ = ['ScanTaskService']

