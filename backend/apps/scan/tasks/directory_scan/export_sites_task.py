"""
导出站点 URL 到 TXT 文件的 Task

使用 export_urls_with_fallback 用例函数处理回退链逻辑
数据源: WebSite.url → Default
"""
import logging
from prefect import task

from apps.scan.services.target_export_service import (
    export_urls_with_fallback,
    DataSource,
)

logger = logging.getLogger(__name__)


@task(name="export_sites")
def export_sites_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000,
) -> dict:
    """
    导出目标下的所有站点 URL 到 TXT 文件

    数据源优先级（回退链）：
    1. WebSite 表 - 站点级别 URL
    2. 默认生成 - 根据 Target 类型生成 http(s)://target_name

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次读取的批次大小，默认 1000

    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int
        }

    Raises:
        ValueError: 参数错误
        IOError: 文件写入失败
    """
    result = export_urls_with_fallback(
        target_id=target_id,
        output_file=output_file,
        sources=[DataSource.WEBSITE, DataSource.DEFAULT],
        batch_size=batch_size,
    )
    
    logger.info(
        "站点 URL 导出完成 - source=%s, count=%d",
        result['source'], result['total_count']
    )
    
    # 保持返回值格式不变（向后兼容）
    return {
        'success': result['success'],
        'output_file': result['output_file'],
        'total_count': result['total_count'],
    }
