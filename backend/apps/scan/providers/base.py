"""
扫描目标提供者基础模块

定义 ProviderContext 数据类和 TargetProvider 抽象基类。
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Iterator, Optional

if TYPE_CHECKING:
    from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


@dataclass
class ProviderContext:
    """
    Provider 上下文，携带元数据

    Attributes:
        target_id: 关联的 Target ID（用于结果保存），None 表示临时扫描（不保存）
        scan_id: 扫描任务 ID
    """
    target_id: Optional[int] = None
    scan_id: Optional[int] = None


class TargetProvider(ABC):
    """
    扫描目标提供者抽象基类

    职责：
    - 提供扫描目标（域名、IP、URL 等）的迭代器
    - 提供黑名单过滤器
    - 携带上下文信息（target_id, scan_id 等）

    方法说明：
    - get_target_name(): Target 名称（根域名/IP/CIDR）
    - iter_subdomains(): 子域名列表
    - iter_host_port_urls(): 从 host:port 生成的 URL（站点探测用）
    - iter_websites(): 已存活网站 URL（截图、指纹、目录扫描用）
    - iter_endpoints(): 端点 URL（漏洞扫描用）

    使用方式：
        provider = DatabaseTargetProvider(target_id=123)

        # 端口扫描：显式组合 target_name + subdomains
        target_name = provider.get_target_name()
        if target_name:
            scan_port(target_name)  # CIDR 需要调用方自己展开
        for subdomain in provider.iter_subdomains():
            scan_port(subdomain)

        # 截图
        for url in provider.iter_websites():
            take_screenshot(url)
    """

    def __init__(self, context: Optional[ProviderContext] = None):
        self._context = context or ProviderContext()

    @property
    def context(self) -> ProviderContext:
        """返回 Provider 上下文"""
        return self._context

    def get_target_name(self) -> Optional[str]:
        """
        获取 Target 名称（根域名/IP/CIDR）

        Returns:
            Target 名称，不存在时返回 None
            注意：CIDR 不会自动展开，调用方需要自己处理
        """
        if not self.target_id:
            logger.warning("target_id 未设置，无法获取 Target 名称")
            return None

        from apps.targets.services import TargetService

        target = TargetService().get_target(self.target_id)
        return target.name if target else None

    @abstractmethod
    def iter_subdomains(self) -> Iterator[str]:
        """迭代子域名列表，子类实现"""

    @abstractmethod
    def iter_host_port_urls(self) -> Iterator[str]:
        """
        迭代 host:port 生成的 URL（待探测）

        用于站点扫描（httpx 探测），从 HostPortMapping 生成 URL。
        返回格式：http://host:port 或 https://host:port
        """

    @abstractmethod
    def iter_websites(self) -> Iterator[str]:
        """
        迭代已存活网站 URL

        用于截图、指纹识别、目录扫描、URL 爬虫。
        数据来源：WebSite 表（已确认存活的网站）
        """

    @abstractmethod
    def iter_endpoints(self) -> Iterator[str]:
        """
        迭代端点 URL

        用于漏洞扫描。
        数据来源：Endpoint 表（带参数的 URL）
        """

    def iter_default_urls(self) -> Iterator[str]:
        """
        从 Target 本身生成默认 URL

        用于跳过前置阶段直接扫描的场景。
        根据 Target 类型生成：
        - DOMAIN: http(s)://domain
        - IP: http(s)://ip
        - CIDR: 展开为所有 IP 的 http(s)://ip
        """
        import ipaddress

        from apps.targets.models import Target
        from apps.targets.services import TargetService

        if not self.target_id:
            logger.warning("target_id 未设置，无法生成默认 URL")
            return

        target = TargetService().get_target(self.target_id)
        if not target:
            logger.warning("Target ID %d 不存在，无法生成默认 URL", self.target_id)
            return

        target_name = target.name
        target_type = target.type
        blacklist = self.get_blacklist_filter()

        if target_type == Target.TargetType.DOMAIN:
            urls = [f"http://{target_name}", f"https://{target_name}"]
        elif target_type == Target.TargetType.IP:
            urls = [f"http://{target_name}", f"https://{target_name}"]
        elif target_type == Target.TargetType.CIDR:
            try:
                network = ipaddress.ip_network(target_name, strict=False)
                urls = []
                for ip in network.hosts():
                    urls.extend([f"http://{ip}", f"https://{ip}"])
                # /32 或 /128 特殊处理
                if not urls:
                    ip = str(network.network_address)
                    urls = [f"http://{ip}", f"https://{ip}"]
            except ValueError as e:
                logger.error("CIDR 解析失败: %s - %s", target_name, e)
                return
        else:
            logger.warning("不支持的 Target 类型: %s", target_type)
            return

        for url in urls:
            if not blacklist or blacklist.is_allowed(url):
                yield url

    @abstractmethod
    def get_blacklist_filter(self) -> Optional['BlacklistFilter']:
        """获取黑名单过滤器，返回 None 表示不过滤"""

    @property
    def target_id(self) -> Optional[int]:
        """返回关联的 target_id，临时扫描返回 None"""
        return self._context.target_id

    @property
    def scan_id(self) -> Optional[int]:
        """返回关联的 scan_id"""
        return self._context.scan_id
