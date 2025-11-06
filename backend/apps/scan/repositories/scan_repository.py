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
    def get_by_id(
        scan_id: int, 
        prefetch_relations: bool = False,
        for_update: bool = False
    ) -> Optional[Scan]:
        """
        根据 ID 获取扫描任务
        
        Args:
            scan_id: 扫描任务 ID
            prefetch_relations: 是否预加载关联对象（engine, target）
                              默认 False，只在需要展示关联信息时设为 True
            for_update: 是否加锁（用于更新场景）
        
        Returns:
            Scan 对象或 None
        """
        try:
            # 根据是否需要更新来决定是否加锁
            if for_update:
                queryset = Scan.objects.select_for_update()  # type: ignore  # pylint: disable=no-member
            else:
                queryset = Scan.objects  # type: ignore  # pylint: disable=no-member
            
            # 预加载关联对象（性能优化：默认不加载）
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
        
        注意：这是 get_by_id(for_update=True) 的便捷方法
        
        Args:
            scan_id: 扫描任务 ID
            prefetch_relations: 是否预加载关联对象（engine, target）
                              更新操作通常不需要，默认为 False
        
        Returns:
            Scan 对象或 None
        """
        return ScanRepository.get_by_id(
            scan_id=scan_id,
            prefetch_relations=prefetch_relations,
            for_update=True
        )
    
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
    def start_scan(
        scan_id: int,
        status: ScanTaskStatus,
        task_id: str,
        task_name: str,
        started_at: Optional[datetime] = None
    ) -> bool:
        """
        启动扫描（首次初始化）
        
        职责：
        - 更新状态（INITIATED → RUNNING）
        - 设置开始时间
        - 初始化任务列表
        
        注意：此方法不做状态检查，由调用方（Service）确保只在 INITIATED 状态调用
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            task_id: Celery 任务 ID
            task_name: 任务名称
            started_at: 开始时间（默认为当前时间）
        
        Returns:
            是否启动成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        # 更新状态和时间
            scan.status = status
            scan.started_at = started_at or timezone.now()
        
        # 初始化任务列表
            scan.task_ids = [task_id] if task_id else []
            scan.task_names = [task_name]
        
            scan.save()
            logger.debug(
            "启动 Scan - ID: %s, 状态: %s, 任务: %s",
                scan_id,
                ScanTaskStatus(status).label,
                task_name
            )
        return True
    
    @staticmethod
    @transaction.atomic
    def append_task(
        scan_id: int,
        task_id: str,
        task_name: str
    ) -> bool:
        """
        追加任务到扫描
        
        职责：
        - 添加任务 ID 和名称到列表
        - 不改变扫描状态
        
        Args:
            scan_id: 扫描任务 ID
            task_id: Celery 任务 ID
            task_name: 任务名称
        
        Returns:
            是否追加成功
        """
        scan = ScanRepository.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        # 避免重复添加
            if task_id and task_id not in scan.task_ids:
                scan.task_ids.append(task_id)
                scan.task_names.append(task_name)
                scan.save()
            logger.debug(
                "追加任务 - Scan ID: %s, Task: %s, 当前状态: %s",
                scan_id,
                task_name,
                ScanTaskStatus(scan.status).label
            )
        else:
            logger.debug(
                "任务已存在，跳过追加 - Scan ID: %s, Task ID: %s",
                scan_id,
                task_id
            )
        
        return True


# 导出接口
__all__ = ['ScanRepository']

