"""
导出 URL 任务

用于指纹识别前导出目标下的 URL 到文件
使用 TargetExportService 统一处理导出逻辑和默认值回退
"""

import logging

from prefect import task

from apps.asset.models import WebSite
from apps.scan.services import TargetExportService, BlacklistService

logger = logging.getLogger(__name__)


@task(name="export_urls_for_fingerprint")
def export_urls_for_fingerprint_task(
    target_id: int,
    output_file: str,
    source: str = 'website',
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的 URL 到文件（用于指纹识别）
    
    数据源: WebSite.url
    
    懒加载模式：
    - 如果数据库为空，根据 Target 类型生成默认 URL
    - DOMAIN: http(s)://domain
    - IP: http(s)://ip
    - CIDR: 展开为所有 IP 的 URL
    - URL: 直接使用目标 URL
    
    Args:
        target_id: 目标 ID
        output_file: 输出文件路径
        source: 数据源类型（保留参数，兼容旧调用）
        batch_size: 批量读取大小
    
    Returns:
        dict: {'output_file': str, 'total_count': int, 'source': str}
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
        'total_count': result['total_count'],
        'source': source
    }
