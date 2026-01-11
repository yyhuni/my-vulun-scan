"""
快照目标提供者模块

提供基于快照表的目标提供者实现。
用于快速扫描的阶段间数据传递。
"""

import logging
from typing import Iterator, Optional

from .base import ProviderContext, TargetProvider

logger = logging.getLogger(__name__)


class SnapshotTargetProvider(TargetProvider):
    """
    快照目标提供者 - 从快照表读取本次扫描的数据

    用于快速扫描的阶段间数据传递，解决精确扫描控制问题。

    核心价值：
    - 只返回本次扫描（scan_id）发现的资产
    - 避免扫描历史数据（DatabaseTargetProvider 会扫描所有历史资产）

    特点：
    - 通过 scan_id 过滤快照表
    - 不应用黑名单过滤（数据已在上一阶段过滤）
    - 每个 iter_* 方法只查对应的快照表（单一职责）
    - 回退逻辑由调用方（Task/Flow）决定

    使用场景：
        provider = SnapshotTargetProvider(scan_id=100)

        # 单一数据源
        for url in provider.iter_websites():
            take_screenshot(url)

        # 调用方控制回退
        urls = list(provider.iter_endpoints())
        if not urls:
            urls = list(provider.iter_websites())
        if not urls:
            urls = list(provider.iter_default_urls())
    """

    def __init__(
        self,
        scan_id: int,
        context: Optional[ProviderContext] = None
    ):
        """
        初始化快照目标提供者

        Args:
            scan_id: 扫描任务 ID（必需）
            context: Provider 上下文
        """
        ctx = context or ProviderContext()
        ctx.scan_id = scan_id
        super().__init__(ctx)
        self._scan_id = scan_id

    def iter_subdomains(self) -> Iterator[str]:
        """从 SubdomainSnapshot 迭代子域名列表"""
        from apps.asset.services.snapshot import SubdomainSnapshotsService
        service = SubdomainSnapshotsService()
        yield from service.iter_subdomain_names_by_scan(
            scan_id=self._scan_id,
            chunk_size=1000
        )

    def iter_host_port_urls(self) -> Iterator[str]:
        """从 HostPortMappingSnapshot 生成待探测的 URL"""
        from apps.asset.services.snapshot import HostPortMappingSnapshotsService
        service = HostPortMappingSnapshotsService()

        for mapping in service.iter_unique_host_ports_by_scan(
            scan_id=self._scan_id,
            batch_size=1000
        ):
            host = mapping['host']
            port = mapping['port']
            if port == 80:
                yield f"http://{host}"
            elif port == 443:
                yield f"https://{host}"
            else:
                yield f"http://{host}:{port}"
                yield f"https://{host}:{port}"

    def iter_websites(self) -> Iterator[str]:
        """从 WebsiteSnapshot 迭代网站 URL"""
        from apps.asset.services.snapshot import WebsiteSnapshotsService
        service = WebsiteSnapshotsService()
        yield from service.iter_website_urls_by_scan(
            scan_id=self._scan_id,
            chunk_size=1000
        )

    def iter_endpoints(self) -> Iterator[str]:
        """从 EndpointSnapshot 迭代端点 URL"""
        from apps.asset.services.snapshot import EndpointSnapshotsService
        service = EndpointSnapshotsService()
        queryset = service.get_by_scan(scan_id=self._scan_id)
        for endpoint in queryset.iterator(chunk_size=1000):
            yield endpoint.url

    def get_blacklist_filter(self) -> None:
        """快照数据已在上一阶段过滤过了"""
        return None
