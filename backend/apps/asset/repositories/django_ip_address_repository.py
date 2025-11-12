"""
Django ORM 实现的 IPAddress Repository
"""

import logging
from typing import List
from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import IPAddress
from .ip_address_repository import IPAddressDTO, IPAddressRepository

logger = logging.getLogger(__name__)


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
                    target_id=item.target_id
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入，忽略冲突
                IPAddress.objects.bulk_create(
                    ip_objects,
                    ignore_conflicts=True,
                    unique_fields=['subdomain', 'ip']  # 根据唯一约束
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
