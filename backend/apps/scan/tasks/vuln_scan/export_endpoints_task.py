"""导出 Endpoint URL 到文件的 Task

使用 export_urls_with_fallback 用例函数处理回退链逻辑

数据源优先级（回退链）：
1. Endpoint.url - 最精细的 URL（含路径、参数等）
2. WebSite.url - 站点级别 URL
3. 默认生成 - 根据 Target 类型生成 http(s)://target_name
"""

import logging
from typing import Dict

from prefect import task

from apps.scan.services.target_export_service import (
    export_urls_with_fallback,
    DataSource,
)

logger = logging.getLogger(__name__)


@task(name="export_endpoints")
def export_endpoints_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000,
) -> Dict[str, object]:
    """导出目标下的所有 Endpoint URL 到文本文件。

    数据源优先级（回退链）：
    1. Endpoint 表 - 最精细的 URL（含路径、参数等）
    2. WebSite 表 - 站点级别 URL
    3. 默认生成 - 根据 Target 类型生成 http(s)://target_name

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次从数据库迭代的批大小

    Returns:
        dict: {
            "success": bool,
            "output_file": str,
            "total_count": int,
            "source": str,  # 数据来源: "endpoint" | "website" | "default" | "none"
        }
    """
    result = export_urls_with_fallback(
        target_id=target_id,
        output_file=output_file,
        sources=[DataSource.ENDPOINT, DataSource.WEBSITE, DataSource.DEFAULT],
        batch_size=batch_size,
    )
    
    logger.info(
        "URL 导出完成 - source=%s, count=%d, tried=%s",
        result['source'], result['total_count'], result['tried_sources']
    )
    
    return {
        "success": result['success'],
        "output_file": result['output_file'],
        "total_count": result['total_count'],
        "source": result['source'],
    }
