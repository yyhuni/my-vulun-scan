"""
导出网站列表任务

从目标下的网站记录中导出 URL 列表到文件
支持两种模式：
1. 从目标导出（通过 target_id）
2. 从扫描导出（通过 scan_id）
"""

import logging
from pathlib import Path
from prefect import task
from typing import Optional

logger = logging.getLogger(__name__)


@task(
    name='export_websites',
    retries=1,
    log_prints=True
)
def export_websites_task(
    output_file: str,
    target_id: Optional[int] = None,
    scan_id: Optional[int] = None,
    batch_size: int = 1000
) -> dict:
    """
    导出网站 URL 列表到文件
    
    Args:
        output_file: 输出文件路径
        target_id: 目标 ID（可选）
        scan_id: 扫描 ID（可选）
        batch_size: 批次大小（内存优化）
        
    Returns:
        dict: {
            'output_file': str,  # 输出文件路径
            'website_count': int,  # 网站数量
            'source': str  # 数据源（target 或 scan）
        }
        
    Raises:
        ValueError: 参数错误
        RuntimeError: 执行失败
    """
    try:
        logger.info("开始导出网站 URL 列表")
        
        if not target_id and not scan_id:
            raise ValueError("必须提供 target_id 或 scan_id 之一")
        
        # 导入模型和服务
        from apps.asset.models import WebSite
        from django.db import connection
        
        # 构建查询条件
        if target_id:
            queryset = WebSite.objects.filter(target_id=target_id).values_list('url', flat=True)
            source = 'target'
            logger.info(f"从目标 {target_id} 导出网站")
        else:
            queryset = WebSite.objects.filter(scan_id=scan_id).values_list('url', flat=True)
            source = 'scan'
            logger.info(f"从扫描 {scan_id} 导出网站")
        
        # 批量写入文件（内存优化）
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        website_count = 0
        with open(output_path, 'w') as f:
            # 使用 iterator() 进行批量处理，避免一次性加载所有数据
            for url in queryset.iterator(chunk_size=batch_size):
                f.write(f"{url}\n")
                website_count += 1
        
        logger.info(f"✓ 导出完成 - 文件: {output_file}, 网站数量: {website_count}")
        
        return {
            'output_file': output_file,
            'website_count': website_count,
            'source': source
        }
        
    except Exception as e:
        logger.error(f"导出网站失败: {e}", exc_info=True)
        raise RuntimeError(f"导出网站失败: {e}") from e
