import logging
from typing import List

from apps.asset.dtos import SubdomainSnapshotDTO, SubdomainDTO, IPAddressDTO
from apps.asset.repositories import (
    DjangoSubdomainSnapshotRepository,
    DjangoIPAddressSnapshotRepository,
    DjangoSubdomainIPSnapshotAssociationRepository,
)

logger = logging.getLogger(__name__)


class SnapshotService:
    """快照服务 - 负责快照数据的业务逻辑"""
    
    def __init__(self):
        self.subdomain_snapshot_repo = DjangoSubdomainSnapshotRepository()
        self.ip_snapshot_repo = DjangoIPAddressSnapshotRepository()
        self.association_repo = DjangoSubdomainIPSnapshotAssociationRepository()
    
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
            
            # 步骤 3: 创建关联关系（如果需要）
            # 注意：这里需要额外的子域名信息来创建关联
            # 建议使用组合保存方法 save_subdomain_with_ips
            
            logger.info("IP地址快照和业务数据保存成功 - 数量: %d", len(items))
            
        except Exception as e:
            logger.error(
                "保存IP地址快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
    
    def save_subdomain_with_ips(self, subdomain_name: str, ip_addresses: List[str], scan_id: int, target_id: int) -> None:
        """
        保存子域名及其关联的IP地址快照（包含关联关系）
        
        Args:
            subdomain_name: 子域名名称
            ip_addresses: IP地址列表
            scan_id: 扫描ID
            target_id: 目标ID
            
        流程：
        1. 保存子域名快照
        2. 保存IP地址快照
        3. 创建关联关系
        4. 同步到业务表
        """
        logger.debug("保存子域名及IP关联快照 - 子域名: %s, IP数量: %d", subdomain_name, len(ip_addresses))
        
        try:
            # 步骤 1: 保存子域名快照
            subdomain_dto = SubdomainSnapshotDTO(
                name=subdomain_name,
                scan_id=scan_id,
                target_id=target_id
            )
            self.save_subdomain_snapshots([subdomain_dto])
            
            # 步骤 2: 保存IP地址快照
            ip_dtos = []
            for ip in ip_addresses:
                ip_dtos.append(IPAddressDTO(
                    ip=ip,
                    scan_id=scan_id,
                    target_id=target_id,
                    subdomain_id=0  # 快照表中不需要真实的 subdomain_id
                ))
            self.save_ip_snapshots(ip_dtos)
            
            # 步骤 3: 创建关联关系（调用 Repository 层）
            self.association_repo.create_subdomain_ip_associations(subdomain_name, ip_addresses, scan_id, target_id)
            
            logger.info("子域名及IP关联快照保存成功 - 子域名: %s, IP数量: %d", subdomain_name, len(ip_addresses))
            
        except Exception as e:
            logger.error(
                "保存子域名及IP关联快照失败 - 子域名: %s, IP数量: %d, 错误: %s",
                subdomain_name, len(ip_addresses), str(e),
                exc_info=True
            )
            raise

    # 未来扩展：其他快照保存方法
    # def save_website_snapshots(self, items: List[WebsiteDTO]) -> None:
    # def save_port_snapshots(self, items: List[PortDTO]) -> None:
