import logging
from typing import List

from apps.asset.dtos import IPAddressDTO
from apps.asset.repositories import DjangoIPAddressSnapshotRepository

logger = logging.getLogger(__name__)


class IPSnapshotsService:
    """IP地址快照服务 - 负责IP快照数据的业务逻辑"""
    
    def __init__(self):
        self.ip_snapshot_repo = DjangoIPAddressSnapshotRepository()
    
    def save_ip_snapshots(self, items: List[IPAddressDTO]) -> None:
        """
        保存IP地址快照（统一入口）
        
        流程：
        1. 保存到快照表（完整记录）
        2. 保存到业务表（去重）
        
        Args:
            items: IP地址 DTO 列表
        """
        logger.debug("保存IP地址快照 - 数量: %d", len(items))
        
        if not items:
            logger.debug("IP快照数据为空，跳过保存")
            return
        
        try:
            # 步骤 1: 保存到快照表
            logger.debug("步骤 1: 保存到IP快照表")
            self.ip_snapshot_repo.save_ip_snapshots(items)
            
            # 步骤 2: 保存业务表（去重）
            from apps.asset.services.ip_address_service import IPAddressService
            ip_service = IPAddressService()
            ip_service.bulk_create_ignore_conflicts(items)
            
            logger.info("IP地址快照和业务数据保存成功 - 数量: %d", len(items))
            
        except Exception as e:
            logger.error(
                "保存IP地址快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
