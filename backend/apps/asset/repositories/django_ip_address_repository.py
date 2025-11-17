"""
Django ORM 实现的 IPAddress Repository
"""

import logging
from typing import List
from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import IPAddress
from .ip_address_repository import IPAddressDTO, IPAddressRepository
from .db_connection_decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoIPAddressRepository(IPAddressRepository):
    """Django ORM 实现的 IPAddress Repository"""

    def bulk_create_ignore_conflicts(self, items: List[IPAddressDTO]) -> None:
        """
        批量创建 IPAddress，忽略冲突
        
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
                    subdomain_id=item.subdomain_id,
                    ip=item.ip,
                    target_id=item.target_id,
                    scan_id=item.scan_id
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入，忽略冲突
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
    
    def get_by_subdomain_and_ips(
        self, 
        subdomain_ids: set, 
        ip_addrs: set
    ) -> dict:
        """
        根据 subdomain_id 和 ip 批量查询 IPAddress
        
        Args:
            subdomain_ids: subdomain ID 集合
            ip_addrs: IP 地址集合
            
        Returns:
            dict: {(subdomain_id, ip): IPAddress对象}
        """
        ip_objects = IPAddress.objects.filter(
            subdomain_id__in=subdomain_ids,
            ip__in=ip_addrs
        ).only('id', 'subdomain_id', 'ip')
        
        return {
            (ip_obj.subdomain_id, ip_obj.ip): ip_obj
            for ip_obj in ip_objects
        }
    
    def get_all(self):
        """
        获取所有 IP 地址
        
        Returns:
            QuerySet: IP 地址查询集
        """
        return IPAddress.objects.all()
    
    def bulk_delete_by_ids(self, ip_address_ids: List[int]) -> tuple:
        """
        批量删除 IP 地址
        
        Args:
            ip_address_ids: IP 地址 ID 列表
            
        Returns:
            tuple: (删除数量, 级联删除的对象统计)
        """
        return IPAddress.objects.filter(id__in=ip_address_ids).delete()
