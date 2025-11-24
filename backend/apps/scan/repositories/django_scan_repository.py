"""
Scan 数据访问层 Django ORM 实现

基于 Django ORM 的 Scan Repository 实现类
"""

from __future__ import annotations

import logging
from typing import List, Tuple, Dict
from datetime import datetime

from django.db import transaction, DatabaseError
from django.db.models import QuerySet, F, Value, Func
from django.utils import timezone

from apps.scan.models import Scan
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.common.definitions import ScanStatus
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoScanRepository:
    """基于 Django ORM 的 Scan 数据访问层实现"""
    
    # ==================== 基础 CRUD 操作 ====================
    
    
    def get_by_id(self,
        scan_id: int, 
        prefetch_relations: bool = False,
        for_update: bool = False
    ) -> Scan | None:
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
    
    
    def get_by_id_for_update(self, scan_id: int) -> Scan | None:
        """
        根据 ID 获取扫描任务（加锁）
        
        用于需要更新的场景，避免并发冲突。
        不预加载关联对象，保持查询最小化，提高加锁性能。
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            Scan 对象或 None
        
        Note:
            - 使用默认的阻塞模式（等待锁释放）
            - 不包含关联对象（engine, target），如需关联对象请使用 get_by_id()
        """
        try:
            return Scan.objects.select_for_update().get(id=scan_id)  # type: ignore  # pylint: disable=no-member
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.warning("Scan 不存在 - Scan ID: %s", scan_id)
            return None
    
    
    def create(self,
        target: Target,
        engine: ScanEngine,
        results_dir: str,
        status: ScanStatus = ScanStatus.INITIATED
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
            flow_run_ids=[],
            flow_run_names=[]
        )
        scan.save()
        logger.debug("创建 Scan - ID: %s, Target: %s", scan.id, target.name)
        return scan
    
    
    def bulk_create(self, scans: List[Scan]) -> List[Scan]:
        """
        批量创建扫描任务
        
        Args:
            scans: Scan 对象列表
        
        Returns:
            创建的 Scan 对象列表
        """
        created_scans = Scan.objects.bulk_create(scans)  # type: ignore  # pylint: disable=no-member
        logger.debug("批量创建 Scan - 数量: %d", len(created_scans))
        return created_scans
    
    
    def soft_delete_by_ids(self, scan_ids: List[int]) -> int:
        """
        根据 ID 列表批量软删除 Scan
        
        Args:
            scan_ids: Scan ID 列表
        
        Returns:
            软删除的记录数
        """
        try:
            updated_count = (
                Scan.objects
                .filter(id__in=scan_ids)
                .update(deleted_at=timezone.now())
            )
            logger.debug(
                "批量软删除 Scan 成功 - Count: %s, 更新记录: %s",
                len(scan_ids),
                updated_count
            )
            return updated_count
        except Exception as e:
            logger.error(
                "批量软删除 Scan 失败 - IDs: %s, 错误: %s",
                scan_ids,
                e
            )
            raise

    def hard_delete_by_ids(self, scan_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        根据 ID 列表硬删除 Scan（使用数据库级 CASCADE）
        
        Args:
            scan_ids: Scan ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        """
        try:
            batch_size = 1000
            total_deleted = 0
            
            logger.debug(f"开始批量删除 {len(scan_ids)} 个 Scan（数据库 CASCADE）...")
            
            for i in range(0, len(scan_ids), batch_size):
                batch_ids = scan_ids[i:i + batch_size]
                count, _ = Scan.all_objects.filter(id__in=batch_ids).delete()
                total_deleted += count
                logger.debug(f"批次删除完成: {len(batch_ids)} 个 Scan，删除 {count} 条记录")
            
            deleted_details = {
                'scans': len(scan_ids),
                'total': total_deleted,
                'note': 'Database CASCADE - detailed stats unavailable'
            }
            
            logger.debug(
                "批量硬删除成功（CASCADE）- Scan数: %s, 总删除记录: %s",
                len(scan_ids),
                total_deleted
            )
            
            return total_deleted, deleted_details
        
        except Exception as e:
            logger.error(
                "批量硬删除失败（CASCADE）- Scan数: %s, 错误: %s",
                len(scan_ids),
                str(e),
                exc_info=True
            )
            raise
    

    
    # ==================== 查询操作 ====================
    
    
    def get_all(self, prefetch_relations: bool = True) -> QuerySet[Scan]:
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
    
    
    def get_statistics(self) -> dict:
        """
        获取扫描任务统计数据
        
        Returns:
            统计数据字典
        
        Note:
            使用数据库聚合查询，性能优异
        """
        from django.db.models import Count
        
        # 基础统计
        total_scans = Scan.objects.count()  # type: ignore  # pylint: disable=no-member
        
        # 按状态统计
        running_scans = Scan.objects.filter(status='running').count()  # type: ignore  # pylint: disable=no-member
        successful_scans = Scan.objects.filter(status='successful').count()  # type: ignore  # pylint: disable=no-member
        failed_scans = Scan.objects.filter(status='failed').count()  # type: ignore  # pylint: disable=no-member
        aborted_scans = Scan.objects.filter(status='aborted').count()  # type: ignore  # pylint: disable=no-member
        initiated_scans = Scan.objects.filter(status='initiated').count()  # type: ignore  # pylint: disable=no-member
        
        # 统计总资产数（注意：这里统计的是关联记录数，不是去重后的）
        total_assets = Scan.objects.aggregate(  # type: ignore  # pylint: disable=no-member
            total_subdomains=Count('subdomains'),
            total_endpoints=Count('endpoints')
        )
        
        total_subdomains = total_assets['total_subdomains'] or 0
        total_endpoints = total_assets['total_endpoints'] or 0
        
        return {
            'total': total_scans,
            'running': running_scans,
            'successful': successful_scans,
            'failed': failed_scans,
            'aborted': aborted_scans,
            'initiated': initiated_scans,
            'total_subdomains': total_subdomains,
            'total_endpoints': total_endpoints,
            'total_assets': total_subdomains + total_endpoints
        }
    
    
    
    # ==================== 状态更新操作 ====================
    
    
    @transaction.atomic
    def update_status(self,
        scan_id: int,
        status: ScanStatus,
        error_message: str | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        更新扫描任务状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            error_message: 错误消息（可选）
            stopped_at: 结束时间（可选，由调用方决定是否传递）
        
        Returns:
            是否更新成功
        
        Note:
            Repository 层不判断业务状态,只负责数据更新
            created_at 是自动设置的，不需要手动传递
        """
        scan = self.get_by_id_for_update(scan_id)
        if not scan:
            return False
        
        scan.status = status
        
        if error_message:
            if len(error_message) > 2000:
                scan.error_message = error_message[:1980] + "... (已截断)"
                logger.warning(
                    "错误信息过长（%d 字符），已截断 - Scan ID: %s",
                    len(error_message), scan_id
                )
            else:
                scan.error_message = error_message
        
        # 根据传递的参数更新时间戳（由调用方决定）
        if stopped_at is not None:
            scan.stopped_at = stopped_at
        
        scan.save()
        logger.debug(
            "更新 Scan 状态 - ID: %s, 状态: %s",
            scan_id,
            ScanStatus(status).label
        )
        return True
    
    
    def append_flow_run_id(self, scan_id: int, flow_run_id: str) -> bool:
        """
        追加 Flow Run ID 到 flow_run_ids 数组（并发安全）
        
        使用 PostgreSQL 的 array_append 函数在数据库层面进行原子操作，
        避免并发场景下的 Race Condition。
        
        Args:
            scan_id: 扫描任务 ID
            flow_run_id: Prefect Flow Run ID
        
        Returns:
            是否追加成功
        
        Note:
            - 使用 F 表达式和 ArrayAppend 确保并发安全
            - 生成的 SQL: UPDATE scan SET flow_run_ids = array_append(flow_run_ids, ?)
            - 适用于未来一个 Scan 可能启动多个 Flow 的场景
        """
        try:
            flow_run_field = Scan._meta.get_field('flow_run_ids')
            updated_count = Scan.objects.filter(id=scan_id).update(  # type: ignore
                flow_run_ids=Func(
                    F('flow_run_ids'),
                    Value(flow_run_id),
                    function='ARRAY_APPEND',
                    output_field=flow_run_field
                )
            )
            
            if updated_count > 0:
                logger.debug(
                    "追加 Flow Run ID - Scan ID: %s, Flow Run ID: %s",
                    scan_id,
                    flow_run_id
                )
                return True
            else:
                logger.warning(
                    "Scan 不存在，无法追加 Flow Run ID - Scan ID: %s",
                    scan_id
                )
                return False
        except DatabaseError as e:
            logger.error(
                "追加 Flow Run ID 失败 - Scan ID: %s, 错误: %s",
                scan_id,
                e
            )
            return False
    
    
    def update_cached_stats(self, scan_id: int) -> bool:
        """
        更新扫描任务的缓存统计数据
        
        使用 Django ORM 聚合查询，避免原生 SQL，保持数据库抽象
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否更新成功
        """
        try:
            scan = self.get_by_id(scan_id, prefetch_relations=False)
            if not scan:
                logger.error("Scan 不存在，无法更新缓存统计数据 - Scan ID: %s", scan_id)
                return False
            
            # 统计快照数据（用于扫描历史）
            # IP 数量需要按 IP 去重统计
            ips_count = scan.host_port_mapping_snapshots.values('ip').distinct().count()
            
            stats = {
                'cached_subdomains_count': scan.subdomain_snapshots.count(),
                'cached_websites_count': scan.website_snapshots.count(), 
                'cached_endpoints_count': scan.endpoint_snapshots.count(),
                'cached_ips_count': ips_count,
                'cached_directories_count': scan.directory_snapshots.count(),
                'stats_updated_at': timezone.now()
            }
            
            # 批量更新字段
            for field, value in stats.items():
                setattr(scan, field, value)
            
            scan.save(update_fields=list(stats.keys()))
            
            logger.debug("更新缓存统计数据成功 - Scan ID: %s", scan_id)
            return True
        except DatabaseError as e:
            logger.exception("数据库错误：更新缓存统计数据失败 - Scan ID: %s", scan_id)
            return False
        except Exception as e:
            logger.error("更新缓存统计数据失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    
    def update_status_if_match(self,
        scan_id: int,
        current_status: ScanStatus,
        new_status: ScanStatus,
        stopped_at: datetime = None
    ) -> bool:
        """
        条件更新扫描状态（原子操作）
        
        仅当扫描状态匹配 current_status 时才更新为 new_status。
        这是一个原子操作，用于处理并发场景下的状态更新。
        
        Args:
            scan_id: 扫描ID
            current_status: 当前期望的状态
            new_status: 要更新到的新状态
            stopped_at: 停止时间（可选）
        
        Returns:
            bool: 是否更新成功（True=更新了记录，False=未更新）
        """
        try:
            update_fields = {
                'status': new_status,
            }
            
            if stopped_at:
                update_fields['stopped_at'] = stopped_at
            
            # 原子操作：只有状态匹配时才更新
            updated = Scan.objects.filter(
                id=scan_id,
                status=current_status
            ).update(**update_fields)
            
            if updated > 0:
                logger.debug(
                    "条件更新扫描状态成功 - Scan ID: %s, %s → %s",
                    scan_id,
                    current_status.value,
                    new_status.value
                )
                return True
            else:
                logger.debug(
                    "条件更新扫描状态跳过（状态不匹配） - Scan ID: %s, 期望: %s, 目标: %s",
                    scan_id,
                    current_status.value,
                    new_status.value
                )
                return False
                
        except Exception as e:
            logger.error(
                "条件更新扫描状态失败 - Scan ID: %s, %s → %s, 错误: %s",
                scan_id,
                current_status.value,
                new_status.value,
                e
            )
            return False


# 导出接口
__all__ = ['DjangoScanRepository']
