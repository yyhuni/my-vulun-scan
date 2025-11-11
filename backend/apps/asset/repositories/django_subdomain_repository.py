import logging
from typing import List

from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import Subdomain
from .subdomain_repository import SubdomainRepository, SubdomainDTO

logger = logging.getLogger(__name__)


class DjangoSubdomainRepository(SubdomainRepository):
    """基于 Django ORM 的子域名仓储实现。"""

    def upsert_many(self, items: List[SubdomainDTO]) -> int:
        """
        批量插入或更新子域名
        
        Args:
            items: 子域名 DTO 列表
            
        Returns:
            int: 成功处理的记录数
            
        Raises:
            IntegrityError: 数据完整性错误（如唯一约束冲突）
            OperationalError: 数据库操作错误（如连接失败）
            DatabaseError: 其他数据库错误
        """
        if not items:
            return 0

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
                # 使用 update_conflicts 策略：
                # - 新子域名：INSERT 完整记录，scan_id = 当前扫描 ID
                # - 已存在子域名：UPDATE 探测字段（cname, is_cdn, cdn_name），scan_id 保持不变
                # 这样每次扫描只显示新增的资产，同时保持探测数据最新
                created = Subdomain.objects.bulk_create(  # type: ignore[attr-defined]
                    subdomain_objects,
                    update_conflicts=True,
                    update_fields=['cname', 'is_cdn', 'cdn_name'],  # 只更新探测字段，不更新 scan_id
                    unique_fields=['name', 'target_id'],  # 唯一约束：同一 Target 下子域名唯一
                )

            count = len(created)
            logger.debug(f"成功处理 {count}/{len(items)} 条子域名记录")
            return count

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


