"""
导出主机列表到 TXT 文件的 Task

使用 TargetProvider 从任意数据源导出主机列表。
"""
import ipaddress
import logging
from pathlib import Path

from prefect import task

from apps.common.validators import detect_target_type
from apps.scan.providers import TargetProvider
from apps.targets.models import Target

logger = logging.getLogger(__name__)


def _expand_cidr(host: str) -> list[str]:
    """展开 CIDR 为 IP 列表，非 CIDR 直接返回"""
    target_type = detect_target_type(host)
    if target_type == Target.TargetType.CIDR:
        network = ipaddress.ip_network(host, strict=False)
        if network.num_addresses == 1:
            return [str(network.network_address)]
        return [str(ip) for ip in network.hosts()]
    return [host]


@task(name="export_hosts")
def export_hosts_task(
    output_file: str,
    provider: TargetProvider,
) -> dict:
    """
    导出主机列表到 TXT 文件

    显式组合 iter_target_name() + iter_subdomains()，CIDR 自动展开。

    Args:
        output_file: 输出文件路径（绝对路径）
        provider: TargetProvider 实例

    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int,
        }

    Raises:
        ValueError: provider 未提供
        IOError: 文件写入失败
    """
    if provider is None:
        raise ValueError("必须提供 provider 参数")

    logger.info("导出主机列表 - Provider: %s", type(provider).__name__)

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    total_count = 0
    blacklist = provider.get_blacklist_filter()

    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        # 1. 导出 Target 名称（根域名/IP/CIDR）
        target_name = provider.get_target_name()
        if target_name:
            for host in _expand_cidr(target_name):
                if not blacklist or blacklist.is_allowed(host):
                    f.write(f"{host}\n")
                    total_count += 1

        # 2. 导出子域名
        for subdomain in provider.iter_subdomains():
            f.write(f"{subdomain}\n")
            total_count += 1

            if total_count % 1000 == 0:
                logger.info("已导出 %d 个主机...", total_count)

    logger.info("✓ 主机列表导出完成 - 总数: %d, 文件: %s", total_count, str(output_path))

    return {
        'success': True,
        'output_file': str(output_path),
        'total_count': total_count,
    }
