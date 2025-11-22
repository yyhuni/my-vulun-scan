import logging
from typing import List

from apps.asset.models.snapshot_models import SubdomainSnapshot, IPAddressSnapshot
from apps.asset.dtos.subdomain_snapshot_dto import SubdomainSnapshotDTO
from apps.asset.repositories.django_ip_address_repository import IPAddressDTO

logger = logging.getLogger(__name__)


class DjangoSnapshotRepository:
    """快照 Repository - 负责快照表的数据访问"""

    def save_subdomain_snapshots(self, items: List[SubdomainSnapshotDTO]) -> None:
        """
        保存子域名快照
        
        Args:
            items: 子域名快照 DTO 列表
        
        Note:
            - 保存完整的快照数据
            - 基于唯一约束自动去重（忽略冲突）
        """
        try:
            logger.debug("准备保存子域名快照 - 数量: %d", len(items))
            
            if not items:
                logger.debug("子域名快照为空，跳过保存")
                return
                
            # 构建快照对象
            snapshots = []
            for item in items:
                snapshots.append(SubdomainSnapshot(
                    scan_id=item.scan_id,
                    name=item.name,
                ))
            
            # 批量创建（忽略冲突，基于唯一约束去重）
            SubdomainSnapshot.objects.bulk_create(snapshots, ignore_conflicts=True)
            
            logger.debug("子域名快照保存成功 - 数量: %d", len(snapshots))
            
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
        保存IP地址快照（暂不处理关联关系）
        
        Args:
            items: IP地址 DTO 列表
        
        Note:
            - 保存完整的快照数据
            - 基于唯一约束自动去重（忽略冲突）
            - 关联关系需要在更上层的服务中处理
        """
        try:
            logger.debug("准备保存IP地址快照 - 数量: %d", len(items))
            
            if not items:
                logger.debug("IP地址快照为空，跳过保存")
                return
                
            # 构建 IP 快照对象
            ip_snapshots = []
            for item in items:
                ip_snapshots.append(IPAddressSnapshot(
                    scan_id=item.scan_id,
                    ip=item.ip,
                    # 其他字段使用模型默认值
                ))
            
            # 批量创建 IP 快照（忽略冲突）
            IPAddressSnapshot.objects.bulk_create(ip_snapshots, ignore_conflicts=True)
            logger.debug("IP地址快照保存成功 - 数量: %d", len(ip_snapshots))
            
        except Exception as e:
            logger.error(
                "保存IP地址快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise

    def create_subdomain_ip_associations(self, subdomain_name: str, ip_addresses: List[str], scan_id: int, target_id: int) -> None:
        """
        创建子域名-IP关联关系（Repository 层负责数据库操作）
        
        Args:
            subdomain_name: 子域名名称
            ip_addresses: IP地址列表
            scan_id: 扫描ID
            target_id: 目标ID
        """
        from apps.asset.models.snapshot_models import SubdomainSnapshot, IPAddressSnapshot, SubdomainIPSnapshotAssociation
        
        try:
            logger.debug("创建子域名-IP关联关系 - 子域名: %s, IP数量: %d", subdomain_name, len(ip_addresses))
            
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
                logger.debug("创建关联关系成功 - 数量: %d", len(associations))
                
        except SubdomainSnapshot.DoesNotExist:
            logger.error("子域名快照不存在: %s", subdomain_name)
            raise
        except Exception as e:
            logger.error("创建关联关系失败: %s", str(e))
            raise

