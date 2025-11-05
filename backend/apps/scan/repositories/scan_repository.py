"""
Scan 模型数据访问层

负责 Scan 模型的所有数据库操作
"""

import logging
from typing import Optional, List
from datetime import datetime

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from apps.scan.models import Scan
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class ScanRepository:
    """Scan 数据访问层"""
    
    # ==================== 基础 CRUD 操作 ====================
    
    @staticmethod
    def get_by_id(scan_id: int, prefetch_relations: bool = True) -> Optional[Scan]:
        """
        根据 ID 获取扫描任务
        
        Args:
            scan_id: 扫描任务 ID
            prefetch_relations: 是否预加载关联对象（engine, target）
        
        Returns:
            Scan 对象或 None
        """
        try:
            queryset = Scan.objects  # type: ignore  # pylint: disable=no-member
            if prefetch_relations:
                queryset = queryset.select_related('engine', 'target')
            return queryset.get(id=scan_id)
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("Scan 不存在 - Scan ID: %s", scan_id)
            return None
    
    @staticmethod
    def get_by_id_for_update(scan_id: int, prefetch_relations: bool = False) -> Optional[Scan]:
        """
        根据 ID 获取扫描任务（加锁）
        
        用于需要更新的场景，避免并发冲突
        
        Args:
            scan_id: 扫描任务 ID
            prefetch_relations: 是否预加载关联对象（engine, target）
                              更新操作通常不需要，默认为 False
        
        Returns:
            Scan 对象或 None
        """
        try:
            queryset = Scan.objects.select_for_update()  # type: ignore  # pylint: disable=no-member
            if prefetch_relations:
                queryset = queryset.select_related('engine', 'target')
            return queryset.get(id=scan_id)
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("Scan 不存在 - Scan ID: %s", scan_id)
            return None
    
    @staticmethod
    def create(
        target: Target,
        engine: ScanEngine,
        results_dir: str,
        status: ScanTaskStatus = ScanTaskStatus.INITIATED
    ) -> Scan:
        """
        创建扫描任务
        
        Args:
            target: 扫描目标
            engine: 扫描引擎
            results_dir: 结果目录
            status: 初始状态
        
        Returns:
            创建的 Scan 对象
        """
        scan = Scan(
            target=target,
            engine=engine,
            results_dir=results_dir,
            status=status,
            task_ids=[]
        )
        scan.save()
        logger.debug("创建 Scan - ID: %s, Target: %s", scan.id, target.name)
        return scan
    
    @staticmethod
    def bulk_create(scans: List[Scan]) -> List[Scan]:
        """
        批量创建扫描任务
        
        Args:
            scans: Scan 对象列表
        
        Returns:
            创建的 Scan 对象列表
        """
        created_scans = Scan.objects.bulk_create(scans)  # type: ignore  # pylint: disable=no-member
        logger.info("批量创建 Scan - 数量: %d", len(created_scans))
        return created_scans
    
    @staticmethod
    def save(scan: Scan) -> Scan:
        """
        保存扫描任务
        
        Args:
            scan: Scan 对象
        
        Returns:
            保存后的 Scan 对象
        """
        scan.save()
        return scan
    
    @staticmethod
    def delete(scan_id: int) -> bool:
        """
        删除扫描任务
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否删除成功
        """
        try:
            scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
            scan.delete()
            logger.info("删除 Scan - ID: %s", scan_id)
            return True
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("Scan 不存在 - Scan ID: %s", scan_id)
            return False
    
    # ==================== 查询操作 ====================
    
    @staticmethod
    def get_all(prefetch_relations: bool = True) -> QuerySet[Scan]:
        """
        获取所有扫描任务
        
        Args:
            prefetch_relations: 是否预加载关联对象（engine, target）
        
        Returns:
            Scan QuerySet
        """
        queryset = Scan.objects.all()  # type: ignore  # pylint: disable=no-member
        if prefetch_relations:
            queryset = queryset.select_related('engine', 'target')
        return queryset
    
    @staticmethod
    def filter_by_status(status: ScanTaskStatus, prefetch_relations: bool = True) -> QuerySet[Scan]:
        """
        根据状态筛选扫描任务
        
        Args:
            status: 任务状态
            prefetch_relations: 是否预加载关联对象（engine, target）
        
        Returns:
            Scan QuerySet
        """
        queryset = Scan.objects.filter(status=status)  # type: ignore  # pylint: disable=no-member
        if prefetch_relations:
            queryset = queryset.select_related('engine', 'target')
        return queryset
    
    @staticmethod
    def filter_by_target(target_id: int, prefetch_relations: bool = True) -> QuerySet[Scan]:
        """
        根据目标筛选扫描任务
        
        Args:
            target_id: 目标 ID
            prefetch_relations: 是否预加载关联对象（engine, target）
        
        Returns:
            Scan QuerySet
        """
        queryset = Scan.objects.filter(target_id=target_id)  # type: ignore  # pylint: disable=no-member
        if prefetch_relations:
            queryset = queryset.select_related('engine', 'target')
        return queryset
    
    # ==================== 状态更新操作 ====================
    
    @staticmethod
    @transaction.atomic
    def update_status(
        scan_id: int,
        status: ScanTaskStatus,
        error_message: Optional[str] = None
    ) -> bool:
        """
        更新扫描任务状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            error_message: 错误消息（可选）
        
        Returns:
            是否更新成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        scan.status = status
        
        if error_message:
            scan.error_message = error_message[:300]
        
        # 如果任务完成，更新结束时间
        if status in [
            ScanTaskStatus.SUCCESSFUL,
            ScanTaskStatus.FAILED,
            ScanTaskStatus.ABORTED
        ]:
            scan.stopped_at = timezone.now()
        
        scan.save()
        logger.debug(
            "更新 Scan 状态 - ID: %s, 状态: %s",
            scan_id,
            ScanTaskStatus(status).label
        )
        return True
    
    @staticmethod
    @transaction.atomic
    def update_started_at(scan_id: int, started_at: Optional[datetime] = None) -> bool:
        """
        更新扫描开始时间
        
        Args:
            scan_id: 扫描任务 ID
            started_at: 开始时间（默认为当前时间）
        
        Returns:
            是否更新成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        scan.started_at = started_at or timezone.now()
        scan.save()
        logger.debug("更新 Scan 开始时间 - ID: %s, 时间: %s", scan_id, scan.started_at)
        return True
    
    @staticmethod
    @transaction.atomic
    def update_stopped_at(scan_id: int, stopped_at: Optional[datetime] = None) -> bool:
        """
        更新扫描结束时间
        
        Args:
            scan_id: 扫描任务 ID
            stopped_at: 结束时间（默认为当前时间）
        
        Returns:
            是否更新成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        scan.stopped_at = stopped_at or timezone.now()
        scan.save()
        logger.debug("更新 Scan 结束时间 - ID: %s, 时间: %s", scan_id, scan.stopped_at)
        return True
    
    # ==================== 任务 ID 管理 ====================
    
    @staticmethod
    @transaction.atomic
    def add_task(scan_id: int, task_id: str, task_name: str) -> bool:
        """
        添加任务 ID 和任务名称
        
        Args:
            scan_id: 扫描任务 ID
            task_id: Celery 任务 ID
            task_name: 任务名称
        
        Returns:
            是否添加成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        # 避免重复添加
        if task_id and task_id not in scan.task_ids:
            scan.task_ids.append(task_id)
            scan.task_names.append(task_name)
            scan.save()
            logger.debug("添加任务 ID - Scan ID: %s, Task: %s", scan_id, task_name)
        
        return True
    
    @staticmethod
    @transaction.atomic
    def initialize_task_lists(scan_id: int, task_id: str, task_name: str) -> bool:
        """
        初始化任务 ID 和任务名称列表
        
        Args:
            scan_id: 扫描任务 ID
            task_id: Celery 任务 ID
            task_name: 任务名称
        
        Returns:
            是否初始化成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        scan.task_ids = [task_id] if task_id else []
        scan.task_names = [task_name]
        scan.save()
        logger.debug("初始化任务列表 - Scan ID: %s, Task: %s", scan_id, task_name)
        return True
    
    # ==================== 组合更新操作 ====================
    
    @staticmethod
    @transaction.atomic
    def initialize_scan(
        scan_id: int,
        status: ScanTaskStatus,
        task_id: str,
        task_name: str,
        started_at: Optional[datetime] = None
    ) -> bool:
        """
        初始化扫描（首个任务开始时）
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            task_id: Celery 任务 ID
            task_name: 任务名称
            started_at: 开始时间（默认为当前时间）
        
        Returns:
            是否初始化成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        # 只在首次初始化时更新
        if scan.status == ScanTaskStatus.INITIATED:
            scan.status = status
            scan.started_at = started_at or timezone.now()
            scan.task_ids = [task_id] if task_id else []
            scan.task_names = [task_name]
            scan.save()
            logger.debug(
                "初始化 Scan - ID: %s, 状态: %s, 任务: %s",
                scan_id,
                ScanTaskStatus(status).label,
                task_name
            )
        else:
            # 追加任务
            if task_id and task_id not in scan.task_ids:
                scan.task_ids.append(task_id)
                scan.task_names.append(task_name)
                scan.save()
                logger.debug("追加任务 - Scan ID: %s, Task: %s", scan_id, task_name)
        
        return True


# 导出接口
__all__ = ['ScanRepository']

