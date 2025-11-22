"""
Django ORM 实现的 IPAddress Repository
"""

import logging
from typing import List, Tuple, Dict
from django.db import transaction, IntegrityError, OperationalError, DatabaseError
from django.utils import timezone

from apps.asset.models.asset_models import IPAddress
from apps.asset.dtos import IPAddressDTO
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)



@auto_ensure_db_connection
class DjangoIPAddressRepository:
    """Django ORM 实现的 IPAddress Repository"""

    def bulk_create_ignore_conflicts(self, items: List[IPAddressDTO]) -> None:
        """
        批量创建 IPAddress，忽略冲突
        
        注意：此方法只创建 IP 记录，不处理与 Subdomain 的关联关系。
        关联关系需要通过 SubdomainIPAssociationRepository 单独创建。
        
        Args:
            items: IPAddress DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        if not items:
            return

        try:
            # 转换为 Django 模型对象
            ip_objects = [
                IPAddress(
                    ip=item.ip,
                    protocol_version=item.protocol_version,
                    is_private=item.is_private,
                    reverse_pointer=item.reverse_pointer
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入，忽略冲突（基于 ip 的唯一约束）
                IPAddress.objects.bulk_create(
                    ip_objects,
                    ignore_conflicts=True,
                )

            logger.debug(f"成功处理 {len(items)} 条 IPAddress 记录")

        except IntegrityError as e:
            logger.error(
                f"批量插入 IPAddress 失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入 IPAddress 失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入 IPAddress 失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入 IPAddress 失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise
    
    def get_by_ips(self, ip_addrs: set) -> dict:
        """
        根据 IP 地址字符串批量查询 IPAddress 对象
        
        Args:
            ip_addrs: IP 地址字符串集合（如 {"192.168.1.1", "10.0.0.1"}）
            
        Returns:
            dict: {ip字符串: IPAddress对象} 的映射
        """
        ip_objects = IPAddress.objects.filter(
            ip__in=ip_addrs
        ).only('id', 'ip')
        
        return {
            ip_obj.ip: ip_obj
            for ip_obj in ip_objects
        }
    
    def get_all(self):
        """
        获取所有 IP 地址
        
        Returns:
            QuerySet: IP 地址查询集
        """
        return IPAddress.objects.all()
    
    def soft_delete_by_ids(self, ip_address_ids: List[int]) -> int:
        """
        根据 ID 列表批量软删除IPAddress
        
        Args:
            ip_address_ids: IPAddress ID 列表
        
        Returns:
            软删除的记录数
        """
        try:
            updated_count = (
                IPAddress.objects
                .filter(id__in=ip_address_ids)
                .update(deleted_at=timezone.now())
            )
            logger.debug(
                "批量软删除IPAddress成功 - Count: %s, 更新记录: %s",
                len(ip_address_ids),
                updated_count
            )
            return updated_count
        except Exception as e:
            logger.error(
                "批量软删除IPAddress失败 - IDs: %s, 错误: %s",
                ip_address_ids,
                e
            )
            raise
    
    def hard_delete_by_ids(self, ip_address_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        根据 ID 列表硬删除IPAddress（使用数据库级 CASCADE）
        
        Args:
            ip_address_ids: IPAddress ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        """
        try:
            batch_size = 1000
            total_deleted = 0
            
            logger.debug(f"开始批量删除 {len(ip_address_ids)} 个IPAddress（数据库 CASCADE）...")
            
            for i in range(0, len(ip_address_ids), batch_size):
                batch_ids = ip_address_ids[i:i + batch_size]
                count, _ = IPAddress.all_objects.filter(id__in=batch_ids).delete()
                total_deleted += count
                logger.debug(f"批次删除完成: {len(batch_ids)} 个IPAddress，删除 {count} 条记录")
            
            deleted_details = {
                'ip_addresses': len(ip_address_ids),
                'total': total_deleted,
                'note': 'Database CASCADE - detailed stats unavailable'
            }
            
            logger.debug(
                "批量硬删除成功（CASCADE）- IPAddress数: %s, 总删除记录: %s",
                len(ip_address_ids),
                total_deleted
            )
            
            return total_deleted, deleted_details
        
        except Exception as e:
            logger.error(
                "批量硬删除失败（CASCADE）- IPAddress数: %s, 错误: %s",
                len(ip_address_ids),
                str(e),
                exc_info=True
            )
            raise
