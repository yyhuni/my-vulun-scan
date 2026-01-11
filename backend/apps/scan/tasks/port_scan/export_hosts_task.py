"""
导出主机列表到 TXT 文件的 Task

使用 TargetProvider 从任意数据源导出主机列表。
"""
import logging
from pathlib import Path

from prefect import task

from apps.scan.providers import TargetProvider

logger = logging.getLogger(__name__)


@task(name="export_hosts")
def export_hosts_task(
    output_file: str,
    provider: TargetProvider,
) -> dict:
    """
    导出主机列表到 TXT 文件

    显式组合 iter_target_hosts() + iter_subdomains()。

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

    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        # 1. 导出 Target 主机（CIDR 自动展开，已过滤黑名单）
        for host in provider.iter_target_hosts():
            f.write(f"{host}\n")
            total_count += 1

        # 2. 导出子域名（Provider 内部已过滤黑名单）
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
