"""
定时扫描任务 Repository

数据访问层：负责 ScheduledScan 模型的 CRUD 操作
"""
import logging
from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass
from datetime import datetime

from django.db import transaction
from django.utils import timezone

from apps.scan.models import ScheduledScan


logger = logging.getLogger(__name__)


@dataclass
class ScheduledScanDTO:
    """定时扫描 DTO"""
    id: Optional[int] = None
    name: str = ''
    description: str = ''
    engine_id: int = 0
    target_ids: List[int] = None
    cron_expression: Optional[str] = None
    is_enabled: bool = True
    deployment_id: str = ''
    run_count: int = 0
    last_run_time: Optional[datetime] = None
    next_run_time: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    


class DjangoScheduledScanRepository:
    """
    定时扫描任务 Repository
    
    职责：
    - CRUD 操作
    - 查询封装
    - 不包含业务逻辑
    """
    
    def get_by_id(self, scheduled_scan_id: int) -> Optional[ScheduledScan]:
        """根据 ID 查询定时扫描任务"""
        try:
            return ScheduledScan.objects.select_related('engine').prefetch_related('targets').get(id=scheduled_scan_id)
        except ScheduledScan.DoesNotExist:
            return None
    
    def get_all(self, page: int = 1, page_size: int = 10) -> Tuple[List[ScheduledScan], int]:
        """
        分页查询所有定时扫描任务
        
        Returns:
            (定时扫描列表, 总数)
        """
        queryset = ScheduledScan.objects.select_related('engine').prefetch_related('targets').order_by('-created_at')
        total = queryset.count()
        
        offset = (page - 1) * page_size
        scheduled_scans = list(queryset[offset:offset + page_size])
        
        return scheduled_scans, total
    
    def get_enabled(self) -> List[ScheduledScan]:
        """获取所有启用的定时扫描任务"""
        return list(
            ScheduledScan.objects.select_related('engine')
            .prefetch_related('targets')
            .filter(is_enabled=True)
            .order_by('-created_at')
        )
    
    def create(self, dto: ScheduledScanDTO) -> ScheduledScan:
        """
        创建定时扫描任务
        
        Args:
            dto: 定时扫描 DTO
        
        Returns:
            创建的 ScheduledScan 对象
        """
        with transaction.atomic():
            scheduled_scan = ScheduledScan.objects.create(
                name=dto.name,
                description=dto.description,
                engine_id=dto.engine_id,
                cron_expression=dto.cron_expression,
                is_enabled=dto.is_enabled,
                deployment_id=dto.deployment_id,
            )
            
            # 设置多对多关系
            if dto.target_ids:
                scheduled_scan.targets.set(dto.target_ids)
            
            logger.info("创建定时扫描任务 - ID: %s, Name: %s", scheduled_scan.id, scheduled_scan.name)
            return scheduled_scan
    
    def update(self, scheduled_scan_id: int, dto: ScheduledScanDTO) -> Optional[ScheduledScan]:
        """
        更新定时扫描任务
        
        Args:
            scheduled_scan_id: 定时扫描 ID
            dto: 更新的数据
        
        Returns:
            更新后的 ScheduledScan 对象，不存在返回 None
        """
        try:
            with transaction.atomic():
                scheduled_scan = ScheduledScan.objects.select_for_update().get(id=scheduled_scan_id)
                
                # 更新基本字段
                if dto.name:
                    scheduled_scan.name = dto.name
                if dto.description is not None:
                    scheduled_scan.description = dto.description
                if dto.engine_id:
                    scheduled_scan.engine_id = dto.engine_id
                if dto.cron_expression:
                    scheduled_scan.cron_expression = dto.cron_expression
                if dto.is_enabled is not None:
                    scheduled_scan.is_enabled = dto.is_enabled
                if dto.deployment_id is not None:
                    scheduled_scan.deployment_id = dto.deployment_id
                if dto.next_run_time is not None:
                    scheduled_scan.next_run_time = dto.next_run_time
                
                scheduled_scan.save()
                
                # 更新多对多关系
                if dto.target_ids is not None:
                    scheduled_scan.targets.set(dto.target_ids)
                
                logger.info("更新定时扫描任务 - ID: %s", scheduled_scan_id)
                return scheduled_scan
                
        except ScheduledScan.DoesNotExist:
            logger.warning("定时扫描任务不存在 - ID: %s", scheduled_scan_id)
            return None
    
    def update_deployment_id(self, scheduled_scan_id: int, deployment_id: str) -> bool:
        """更新 Prefect Deployment ID"""
        updated = ScheduledScan.objects.filter(id=scheduled_scan_id).update(
            deployment_id=deployment_id
        )
        return updated > 0
    
    def update_next_run_time(self, scheduled_scan_id: int, next_run_time: datetime) -> bool:
        """更新下次执行时间"""
        updated = ScheduledScan.objects.filter(id=scheduled_scan_id).update(
            next_run_time=next_run_time
        )
        return updated > 0
    
    def increment_run_count(self, scheduled_scan_id: int) -> bool:
        """增加执行次数并更新上次执行时间"""
        from django.db.models import F
        updated = ScheduledScan.objects.filter(id=scheduled_scan_id).update(
            run_count=F('run_count') + 1,
            last_run_time=timezone.now()
        )
        return updated > 0
    
    def toggle_enabled(self, scheduled_scan_id: int, enabled: bool) -> bool:
        """切换启用状态"""
        updated = ScheduledScan.objects.filter(id=scheduled_scan_id).update(
            is_enabled=enabled
        )
        return updated > 0
    
    def soft_delete(self, scheduled_scan_id: int) -> bool:
        """软删除定时扫描任务"""
        updated = ScheduledScan.objects.filter(id=scheduled_scan_id).update(
            deleted_at=timezone.now()
        )
        if updated > 0:
            logger.info("软删除定时扫描任务 - ID: %s", scheduled_scan_id)
        return updated > 0
    
    def hard_delete(self, scheduled_scan_id: int) -> bool:
        """硬删除定时扫描任务"""
        deleted, _ = ScheduledScan.all_objects.filter(id=scheduled_scan_id).delete()
        if deleted > 0:
            logger.info("硬删除定时扫描任务 - ID: %s", scheduled_scan_id)
        return deleted > 0
