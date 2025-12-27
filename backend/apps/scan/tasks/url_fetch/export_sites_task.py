"""
导出站点 URL 列表任务

使用 TargetExportService 统一处理导出逻辑和默认值回退
数据源: WebSite.url（用于 katana 等爬虫工具）
"""

import logging
from prefect import task
from typing import Optional

from apps.asset.models import WebSite
from apps.scan.services import TargetExportService, BlacklistService

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
    
    数据源: WebSite.url
    
    懒加载模式：
    - 如果数据库为空，根据 Target 类型生成默认 URL
    - DOMAIN: http(s)://domain
    - IP: http(s)://ip
    - CIDR: 展开为所有 IP 的 URL
    
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
    # 构建数据源 queryset（Task 层决定数据源）
    queryset = WebSite.objects.filter(target_id=target_id).values_list('url', flat=True)
    
    # 使用 TargetExportService 处理导出
    blacklist_service = BlacklistService()
    export_service = TargetExportService(blacklist_service=blacklist_service)
    
    result = export_service.export_urls(
        target_id=target_id,
        output_path=output_file,
        queryset=queryset,
        batch_size=batch_size
    )
    
    # 保持返回值格式不变（向后兼容）
    return {
        'output_file': result['output_file'],
        'asset_count': result['total_count'],
    }
