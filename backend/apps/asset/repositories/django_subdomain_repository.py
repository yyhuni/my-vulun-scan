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

        return len(created)


