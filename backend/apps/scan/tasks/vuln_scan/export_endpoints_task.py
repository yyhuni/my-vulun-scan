"""导出 Endpoint URL 到文件的 Task

使用 TargetExportService 统一处理导出逻辑和默认值回退
数据源: Endpoint.url
"""

import logging
from typing import Dict, Optional

from prefect import task

from apps.asset.models import Endpoint
from apps.scan.services import TargetExportService, BlacklistService

logger = logging.getLogger(__name__)


@task(name="export_endpoints")
def export_endpoints_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000,
) -> Dict[str, object]:
    """导出目标下的所有 Endpoint URL 到文本文件。

    数据源: Endpoint.url
    
    懒加载模式：
    - 如果数据库为空，根据 Target 类型生成默认 URL
    - DOMAIN: http(s)://domain
    - IP: http(s)://ip
    - CIDR: 展开为所有 IP 的 URL

    Args:
        target_id: 目标 ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次从数据库迭代的批大小

    Returns:
        dict: {
            "success": bool,
            "output_file": str,
            "total_count": int,
        }
    """
    # 构建数据源 queryset（Task 层决定数据源）
    queryset = Endpoint.objects.filter(target_id=target_id).values_list('url', flat=True)
    
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
        "success": result['success'],
        "output_file": result['output_file'],
        "total_count": result['total_count'],
    }
