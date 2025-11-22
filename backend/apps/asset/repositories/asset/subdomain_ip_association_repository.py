"""
Django ORM 实现的 SubdomainIPAssociation Repository
"""

import logging
from typing import List
from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models.asset_models import SubdomainIPAssociation
from apps.asset.dtos.subdomain_ip_association_dto import SubdomainIPAssociationDTO
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoSubdomainIPAssociationRepository:
    """Django ORM 实现的 SubdomainIPAssociation Repository"""

    def bulk_create_ignore_conflicts(self, items: List[SubdomainIPAssociationDTO]) -> None:
        """
        批量创建子域名-IP关联（纯资产表），忽略冲突
        
        使用 bulk_create + ignore_conflicts 高效批量插入。
        基于 (subdomain, ip_address) 的唯一约束，重复记录会被自动跳过。
        
        Args:
            items: SubdomainIPAssociation DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        if not items:
            return

        try:
            # 转换为 Django 模型对象
            association_objects = [
                SubdomainIPAssociation(
                    subdomain_id=item.subdomain_id,
                    ip_address_id=item.ip_address_id
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入，忽略冲突（基于 subdomain, ip_address 的唯一约束）
                SubdomainIPAssociation.objects.bulk_create(
                    association_objects,
                    ignore_conflicts=True
                )

            logger.debug(f"成功批量处理 {len(items)} 条 SubdomainIPAssociation 记录")

        except IntegrityError as e:
            logger.error(
                f"批量插入 SubdomainIPAssociation 失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入 SubdomainIPAssociation 失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入 SubdomainIPAssociation 失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入 SubdomainIPAssociation 失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise

    def get_by_subdomain(self, subdomain_id: int) -> list:
        """
        根据子域名ID查询所有关联记录
        
        Args:
            subdomain_id: 子域名ID
            
        Returns:
            list: 关联记录列表
        """
        return list(
            SubdomainIPAssociation.objects.filter(
                subdomain_id=subdomain_id
            ).select_related('ip_address')
        )

    def get_all(self):
        """
        获取所有关联记录
        
        Returns:
            QuerySet: 关联记录查询集
        """
        return SubdomainIPAssociation.objects.all()
