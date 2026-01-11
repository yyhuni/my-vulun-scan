"""
数据库目标提供者模块

提供基于数据库查询的目标提供者实现。
用于完整扫描模式，从 Target 关联的资产表查询数据。
"""

import logging
from typing import TYPE_CHECKING, Iterator, Optional

from .base import ProviderContext, TargetProvider

if TYPE_CHECKING:
    from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


class DatabaseTargetProvider(TargetProvider):
    """
    数据库目标提供者 - 从 Target 表及关联资产表查询

    用于完整扫描模式，查询目标下的所有历史资产。

    数据来源：
    - iter_target_name(): Target 表（根域名/IP/CIDR）
    - iter_subdomains(): Subdomain 表
    - iter_host_port_urls(): HostPortMapping 表
    - iter_websites(): WebSite 表
    - iter_endpoints(): Endpoint 表
    - iter_default_urls(): 从 Target 本身生成默认 URL

    回退逻辑由调用方（Task/Flow）决定，Provider 只负责单一数据源查询。

    使用方式：
        provider = DatabaseTargetProvider(target_id=123)

        # 端口扫描：显式组合
        for name in provider.iter_target_name():
            scan_port(name)  # CIDR 需要调用方自己展开
        for subdomain in provider.iter_subdomains():
            scan_port(subdomain)

        # 调用方控制回退
        urls = list(provider.iter_endpoints())
        if not urls:
            urls = list(provider.iter_websites())
        if not urls:
            urls = list(provider.iter_default_urls())
    """

    def __init__(self, target_id: int, context: Optional[ProviderContext] = None):
        ctx = context or ProviderContext()
        ctx.target_id = target_id
        super().__init__(ctx)
        self._blacklist_filter: Optional['BlacklistFilter'] = None

    def iter_subdomains(self) -> Iterator[str]:
        """从 Subdomain 表查询子域名列表"""
        from apps.asset.services.asset.subdomain_service import SubdomainService

        blacklist = self.get_blacklist_filter()

        for domain in SubdomainService().iter_subdomain_names_by_target(
            target_id=self.target_id,
            chunk_size=1000
        ):
            if not blacklist or blacklist.is_allowed(domain):
                yield domain

    def iter_host_port_urls(self) -> Iterator[str]:
        """从 HostPortMapping 表生成待探测的 URL"""
        from apps.asset.models import HostPortMapping

        blacklist = self.get_blacklist_filter()

        queryset = HostPortMapping.objects.filter(
            target_id=self.target_id
        ).values('host', 'port').distinct()

        for mapping in queryset.iterator(chunk_size=1000):
            host = mapping['host']
            port = mapping['port']

            if port == 80:
                urls = [f"http://{host}"]
            elif port == 443:
                urls = [f"https://{host}"]
            else:
                urls = [f"http://{host}:{port}", f"https://{host}:{port}"]

            for url in urls:
                if not blacklist or blacklist.is_allowed(url):
                    yield url

    def iter_websites(self) -> Iterator[str]:
        """从 WebSite 表查询已存活网站 URL"""
        from apps.asset.models import WebSite

        blacklist = self.get_blacklist_filter()

        queryset = WebSite.objects.filter(
            target_id=self.target_id
        ).values_list('url', flat=True)

        for url in queryset.iterator(chunk_size=1000):
            if url:
                if not blacklist or blacklist.is_allowed(url):
                    yield url

    def iter_endpoints(self) -> Iterator[str]:
        """从 Endpoint 表查询端点 URL"""
        from apps.asset.models import Endpoint

        blacklist = self.get_blacklist_filter()

        queryset = Endpoint.objects.filter(
            target_id=self.target_id
        ).values_list('url', flat=True)

        for url in queryset.iterator(chunk_size=1000):
            if url:
                if not blacklist or blacklist.is_allowed(url):
                    yield url

    def get_blacklist_filter(self) -> Optional['BlacklistFilter']:
        """获取黑名单过滤器（延迟加载）"""
        if self._blacklist_filter is None:
            from apps.common.services import BlacklistService
            from apps.common.utils import BlacklistFilter
            rules = BlacklistService().get_rules(self.target_id)
            self._blacklist_filter = BlacklistFilter(rules)
        return self._blacklist_filter
