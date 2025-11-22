"""Django ORM 实现的 SubdomainIPSnapshotAssociation Repository"""

import logging
from typing import List

from apps.asset.models.snapshot_models import (
    SubdomainSnapshot, 
    IPAddressSnapshot, 
    SubdomainIPSnapshotAssociation
)

logger = logging.getLogger(__name__)


class DjangoSubdomainIPSnapshotAssociationRepository:
    """子域名-IP快照关联 Repository - 负责快照关联表的数据访问"""

    def create_subdomain_ip_associations(
        self, 
        subdomain_name: str, 
        ip_addresses: List[str], 
        scan_id: int, 
        target_id: int
    ) -> None:
        """
        创建子域名-IP快照关联关系
        
        Args:
            subdomain_name: 子域名名称
            ip_addresses: IP地址列表
            scan_id: 扫描ID
            target_id: 目标ID
        """
        try:
            logger.debug("创建子域名-IP快照关联 - 子域名: %s, IP数量: %d", subdomain_name, len(ip_addresses))
            
            # 查找子域名快照
            subdomain_snapshot = SubdomainSnapshot.objects.get(
                scan_id=scan_id,
                name=subdomain_name
            )
            
            # 批量创建关联关系
            associations = []
            for ip_address in ip_addresses:
                try:
                    ip_snapshot = IPAddressSnapshot.objects.get(
                        scan_id=scan_id,
                        ip=ip_address
                    )
                    associations.append(SubdomainIPSnapshotAssociation(
                        subdomain_snapshot=subdomain_snapshot,
                        ip_snapshot=ip_snapshot,
                        scan_id=scan_id,
                        target_id=target_id,
                    ))
                except IPAddressSnapshot.DoesNotExist:
                    logger.warning("IP快照不存在，跳过关联: %s", ip_address)
                    continue
            
            # 批量创建关联关系
            if associations:
                SubdomainIPSnapshotAssociation.objects.bulk_create(associations, ignore_conflicts=True)
                logger.debug("创建快照关联成功 - 数量: %d", len(associations))
                
        except SubdomainSnapshot.DoesNotExist:
            logger.error("子域名快照不存在: %s", subdomain_name)
            raise
        except Exception as e:
            logger.error("创建快照关联失败: %s", str(e))
            raise
