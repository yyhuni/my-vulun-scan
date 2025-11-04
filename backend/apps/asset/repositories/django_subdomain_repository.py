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
            )
            for item in items
        ]

        with transaction.atomic():
            created = Subdomain.objects.bulk_create(  # type: ignore[attr-defined]
                subdomain_objects,
                ignore_conflicts=True,
            )

        return len(created)


