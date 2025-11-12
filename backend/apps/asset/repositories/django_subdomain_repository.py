import logging
from typing import List

from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import Subdomain
from .subdomain_repository import SubdomainRepository, SubdomainDTO

logger = logging.getLogger(__name__)


class DjangoSubdomainRepository(SubdomainRepository):
    """基于 Django ORM 的子域名仓储实现。"""

    def bulk_create_ignore_conflicts(self, items: List[SubdomainDTO]) -> None:
        """
        批量创建子域名，忽略冲突
        
        Args:
            items: 子域名 DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误（如唯一约束冲突）
            OperationalError: 数据库操作错误（如连接失败）
            DatabaseError: 其他数据库错误
        """
        if not items:
            return

        try:
            subdomain_objects = [
                Subdomain(
                    name=item.name,
                    scan_id=item.scan_id,
                    target_id=item.target_id,
                    cname=[],  # 显式设置为空列表，避免 ArrayField 类型不匹配
                    is_cdn=False,  # 设置默认值
                    cdn_name='',  # 设置默认值
                )
                for item in items
            ]

            with transaction.atomic():
                # 使用 ignore_conflicts 策略：
                # - 新子域名：INSERT 完整记录
                # - 已存在子域名：忽略（不更新，因为没有探测字段数据）
                # 注意：ignore_conflicts 无法返回实际创建的数量
                Subdomain.objects.bulk_create(  # type: ignore[attr-defined]
                    subdomain_objects,
                    ignore_conflicts=True,  # 忽略重复记录
                    unique_fields=['name', 'target_id'],  # 唯一约束：同一 Target 下子域名唯一
                )

            logger.debug(f"成功处理 {len(items)} 条子域名记录")

        except IntegrityError as e:
            logger.error(
                f"批量插入子域名失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}, "
                f"示例域名: {items[0].name if items else 'N/A'}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入子域名失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入子域名失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入子域名失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise


