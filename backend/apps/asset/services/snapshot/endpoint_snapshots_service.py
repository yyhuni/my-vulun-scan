"""Endpoint Snapshots Service - 业务逻辑层"""

import logging
from typing import Iterator, List, Optional

from apps.asset.dtos.snapshot import EndpointSnapshotDTO
from apps.asset.repositories.snapshot import DjangoEndpointSnapshotRepository
from apps.asset.services.asset import EndpointService

logger = logging.getLogger(__name__)


class EndpointSnapshotsService:
    """端点快照服务 - 统一管理快照和资产同步"""

    # 智能过滤字段映射
    FILTER_FIELD_MAPPING = {
        'url': 'url',
        'host': 'host',
        'title': 'title',
        'status_code': 'status_code',
        'webserver': 'webserver',
        'tech': 'tech',
    }

    def __init__(self):
        self.snapshot_repo = DjangoEndpointSnapshotRepository()
        self.asset_service = EndpointService()

    def save_and_sync(self, items: List[EndpointSnapshotDTO]) -> None:
        """
        保存端点快照并同步到资产表（统一入口）

        流程：
        1. 保存到快照表（完整记录）
        2. 同步到资产表（去重）

        Args:
            items: 端点快照 DTO 列表（必须包含 target_id）

        Raises:
            ValueError: 如果 items 中的 target_id 为 None
            Exception: 数据库操作失败
        """
        if not items:
            return

        # 检查 Scan 是否仍存在（防止删除后竞态写入）
        scan_id = items[0].scan_id
        from apps.scan.repositories import DjangoScanRepository
        if not DjangoScanRepository().exists(scan_id):
            logger.warning("Scan 已删除，跳过端点快照保存 - scan_id=%s, 数量=%d", scan_id, len(items))
            return

        try:
            logger.debug("保存端点快照并同步到资产表 - 数量: %d", len(items))

            # 步骤 1: 保存到快照表
            self.snapshot_repo.save_snapshots(items)

            # 步骤 2: 转换为资产 DTO 并保存到资产表（upsert）
            asset_items = [item.to_asset_dto() for item in items]
            self.asset_service.bulk_upsert(asset_items)

            logger.info("端点快照和资产数据保存成功 - 数量: %d", len(items))

        except Exception as e:
            logger.error("保存端点快照失败 - 数量: %d, 错误: %s", len(items), str(e), exc_info=True)
            raise

    def get_by_scan(self, scan_id: int, filter_query: Optional[str] = None):
        """
        获取指定扫描的端点快照

        Args:
            scan_id: 扫描 ID
            filter_query: 过滤查询字符串

        Returns:
            QuerySet: 端点快照查询集
        """
        from apps.common.utils.filter_utils import apply_filters

        queryset = self.snapshot_repo.get_by_scan(scan_id)
        if filter_query:
            queryset = apply_filters(queryset, filter_query, self.FILTER_FIELD_MAPPING)
        return queryset

    def get_all(self, filter_query: Optional[str] = None):
        """
        获取所有端点快照

        Args:
            filter_query: 过滤查询字符串

        Returns:
            QuerySet: 端点快照查询集
        """
        from apps.common.utils.filter_utils import apply_filters

        queryset = self.snapshot_repo.get_all()
        if filter_query:
            queryset = apply_filters(queryset, filter_query, self.FILTER_FIELD_MAPPING)
        return queryset

    def iter_endpoint_urls_by_scan(self, scan_id: int, chunk_size: int = 1000) -> Iterator[str]:
        """流式获取某次扫描下的所有端点 URL"""
        queryset = self.snapshot_repo.get_by_scan(scan_id)
        for snapshot in queryset.iterator(chunk_size=chunk_size):
            yield snapshot.url

    def iter_raw_data_for_csv_export(self, scan_id: int) -> Iterator[dict]:
        """
        流式获取原始数据用于 CSV 导出

        Args:
            scan_id: 扫描 ID

        Yields:
            原始数据字典
        """
        return self.snapshot_repo.iter_raw_data_for_export(scan_id=scan_id)
