"""
导出站点URL到文件的Task

使用 TargetProvider 从任意数据源导出 URL（用于 httpx 站点探测）。

数据源：HostPortMapping，为空时回退到默认 URL
"""
import logging
from pathlib import Path
from prefect import task

from apps.scan.providers import TargetProvider

logger = logging.getLogger(__name__)


@task(name="export_site_urls")
def export_site_urls_task(
    output_file: str,
    provider: TargetProvider,
) -> dict:
    """
    导出目标下的所有站点URL到文件

    数据源：HostPortMapping，为空时回退到默认 URL

    Args:
        output_file: 输出文件路径（绝对路径）
        provider: TargetProvider 实例

    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_urls': int,
            'source': str,  # host_port | default
        }

    Raises:
        ValueError: provider 未提供
    """
    if provider is None:
        raise ValueError("必须提供 provider 参数")

    logger.info("导出 URL - Provider: %s", type(provider).__name__)

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 按优先级获取数据源
    urls = list(provider.iter_host_port_urls())
    source = "host_port"

    if not urls:
        logger.info("HostPortMapping 为空，生成默认 URL")
        urls = list(provider.iter_default_urls())
        source = "default"

    # 写入文件
    total_urls = 0
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for url in urls:
            f.write(f"{url}\n")
            total_urls += 1

    logger.info(
        "✓ URL 导出完成 - 来源: %s, 总数: %d, 文件: %s",
        source, total_urls, str(output_path)
    )

    return {
        'success': True,
        'output_file': str(output_path),
        'total_urls': total_urls,
        'source': source,
    }
