"""
扫描目标提供者模块

提供统一的目标获取接口，支持多种数据源：
- DatabaseTargetProvider: 从数据库查询（完整扫描）
- SnapshotTargetProvider: 从快照表读取（快速扫描）

Provider 方法：
- get_target_name(): Target 名称（根域名/IP/CIDR）
- iter_subdomains(): 子域名列表
- iter_host_port_urls(): 从 host:port 生成的 URL（站点探测用）
- iter_websites(): 已存活网站 URL（截图、指纹、目录扫描用）
- iter_endpoints(): 端点 URL（漏洞扫描用）

使用方式：
    from apps.scan.providers import (
        DatabaseTargetProvider,
        SnapshotTargetProvider,
        ProviderContext
    )

    # 数据库模式（完整扫描）
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

    # 快照模式（快速扫描）
    provider = SnapshotTargetProvider(scan_id=100)
    for url in provider.iter_websites():
        take_screenshot(url)
"""

from .base import TargetProvider, ProviderContext
from .database_provider import DatabaseTargetProvider
from .snapshot_provider import SnapshotTargetProvider

__all__ = [
    'TargetProvider',
    'ProviderContext',
    'DatabaseTargetProvider',
    'SnapshotTargetProvider',
]
