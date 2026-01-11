"""导出 Endpoint URL 到文件的 Task

使用 TargetProvider 从任意数据源导出 URL。

数据源：Endpoint，为空时回退到默认 URL
"""

import logging
from typing import Dict
from pathlib import Path

from prefect import task

from apps.scan.providers import TargetProvider

logger = logging.getLogger(__name__)


@task(name="export_endpoints")
def export_endpoints_task(
    output_file: str,
    provider: TargetProvider,
) -> Dict[str, object]:
    """导出目标下的所有 Endpoint URL 到文本文件。

    数据源优先级：Endpoint → 默认生成

    Args:
        output_file: 输出文件路径（绝对路径）
        provider: TargetProvider 实例

    Returns:
        dict: {
            "success": bool,
            "output_file": str,
            "total_count": int,
            "source": str,  # endpoint | default
        }
    """
    if provider is None:
        raise ValueError("必须提供 provider 参数")

    logger.info("导出 URL - Provider: %s", type(provider).__name__)

    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 获取数据，为空时回退到默认 URL
    urls = list(provider.iter_endpoints())
    source = "endpoint"

    if not urls:
        logger.info("Endpoint 为空，生成默认 URL")
        urls = list(provider.iter_default_urls())
        source = "default"

    # 写入文件
    total_count = 0
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for url in urls:
            f.write(f"{url}\n")
            total_count += 1

    logger.info(
        "✓ URL 导出完成 - 来源: %s, 总数: %d, 文件: %s",
        source, total_count, str(output_path)
    )

    return {
        "success": True,
        "output_file": str(output_path),
        "total_count": total_count,
        "source": source,
    }
