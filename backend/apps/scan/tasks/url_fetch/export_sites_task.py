"""
导出站点 URL 列表任务

使用 export_urls_with_fallback 用例函数处理回退链逻辑
数据源: WebSite.url → Default（用于 katana 等爬虫工具）
"""

import logging
from prefect import task

from apps.scan.services.target_export_service import (
    export_urls_with_fallback,
    DataSource,
)

logger = logging.getLogger(__name__)


@task(
    name='export_sites_for_url_fetch',
    retries=1,
    log_prints=True
)
def export_sites_task(
    output_file: str,
    target_id: int,
    scan_id: int,
    batch_size: int = 1000
) -> dict:
    """
    导出站点 URL 列表到文件（用于 katana 等爬虫工具）
    
    数据源优先级（回退链）：
    1. WebSite 表 - 站点级别 URL
    2. 默认生成 - 根据 Target 类型生成 http(s)://target_name
    
    Args:
        output_file: 输出文件路径
        target_id: 目标 ID
        scan_id: 扫描 ID（保留参数，兼容旧调用）
        batch_size: 批次大小（内存优化）
        
    Returns:
        dict: {
            'output_file': str,  # 输出文件路径
            'asset_count': int,  # 资产数量
        }
        
    Raises:
        ValueError: 参数错误
        RuntimeError: 执行失败
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
        'output_file': result['output_file'],
        'asset_count': result['total_count'],
    }
