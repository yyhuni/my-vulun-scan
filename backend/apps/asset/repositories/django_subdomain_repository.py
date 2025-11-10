from typing import List

from django.db import transaction

from apps.asset.models import Subdomain
from .subdomain_repository import SubdomainRepository, SubdomainDTO


class DjangoSubdomainRepository(SubdomainRepository):
    """基于 Django ORM 的子域名仓储实现。"""

    def upsert_many(self, items: List[SubdomainDTO]) -> int:
        if not items:
            return 0

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
            # 使用 ignore_conflicts 忽略冲突（唯一约束是 name + target_id + scan_id）
            # 每次扫描都会创建独立的子域名记录
            created = Subdomain.objects.bulk_create(  # type: ignore[attr-defined]
                subdomain_objects,
                ignore_conflicts=True,
            )

        return len(created)


