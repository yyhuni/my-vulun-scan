import logging
from typing import List

from apps.asset.dtos import SubdomainSnapshotDTO
from apps.asset.repositories import DjangoSubdomainSnapshotRepository

logger = logging.getLogger(__name__)


class SubdomainSnapshotsService:
    """子域名快照服务 - 负责子域名快照数据的业务逻辑"""
    
    def __init__(self):
        self.subdomain_snapshot_repo = DjangoSubdomainSnapshotRepository()
    
    def save_subdomain_snapshots(self, items: List[SubdomainSnapshotDTO]) -> None:
        """
        保存子域名快照（统一入口）
        
        流程：
        1. 保存到快照表（完整记录，包含 scan_id）
        2. 保存到资产表（去重，不包含 scan_id）
        
        Args:
            items: 子域名快照 DTO 列表（包含 target_id）
        
        Note:
            target_id 已经包含在 DTO 中，无需额外传参。
        """
        logger.debug("保存子域名快照 - 数量: %d", len(items))
        
        if not items:
            logger.debug("快照数据为空，跳过保存")
            return
        
        try:
            # 步骤 1: 保存到快照表
            logger.debug("步骤 1: 保存到快照表")
            self.subdomain_snapshot_repo.save_subdomain_snapshots(items)
            
            # 步骤 2: 转换为资产 DTO 并保存到资产表（通过数据库唯一约束自动去重）
            # 注意：去重是通过数据库的 UNIQUE 约束 + ignore_conflicts 实现的
            # - 新子域名：插入资产表
            # - 已存在的子域名：自动跳过（不更新，因为资产表只记录核心数据）
            asset_items = [item.to_asset_dto() for item in items]
            
            from apps.asset.services import SubdomainService
            subdomain_service = SubdomainService()
            subdomain_service.bulk_create_ignore_conflicts(asset_items)
            
            logger.info("子域名快照和业务数据保存成功 - 数量: %d", len(items))
            
        except Exception as e:
            logger.error(
                "保存子域名快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise