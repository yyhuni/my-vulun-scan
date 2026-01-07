"""
导出 URL 任务

用于指纹识别前导出目标下的 URL 到文件
使用 export_urls_with_fallback 用例函数处理回退链逻辑
"""

import logging

from prefect import task

from apps.scan.services.target_export_service import (
    export_urls_with_fallback,
    DataSource,
)

logger = logging.getLogger(__name__)


@task(name="export_urls_for_fingerprint")
def export_urls_for_fingerprint_task(
    target_id: int,
    output_file: str,
    source: str = 'website',  # 保留参数，兼容旧调用（实际值由回退链决定）
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的 URL 到文件（用于指纹识别）
    
    数据源优先级（回退链）：
    1. WebSite 表 - 站点级别 URL
    2. 默认生成 - 根据 Target 类型生成 http(s)://target_name
    
    Args:
        target_id: 目标 ID
        output_file: 输出文件路径
        source: 数据源类型（保留参数，兼容旧调用，实际值由回退链决定）
        batch_size: 批量读取大小
    
    Returns:
        dict: {'output_file': str, 'total_count': int, 'source': str}
    """
    result = export_urls_with_fallback(
        target_id=target_id,
        output_file=output_file,
        sources=[DataSource.WEBSITE, DataSource.DEFAULT],
        batch_size=batch_size,
    )
    
    logger.info(
        "指纹识别 URL 导出完成 - source=%s, count=%d",
        result['source'], result['total_count']
    )
    
    # 返回实际使用的数据源（不再固定为 "website"）
    return {
        'output_file': result['output_file'],
        'total_count': result['total_count'],
        'source': result['source'],
    }
