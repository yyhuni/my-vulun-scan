"""
网站删除任务模块

负责单个网站的硬删除（Prefect Task）
"""

import logging
from typing import Dict

from prefect import task
from django.db import close_old_connections

logger = logging.getLogger(__name__)


@task(name="hard-delete-website", retries=2, retry_delay_seconds=60)
def hard_delete_website_task(website_id: int, website_name: str) -> Dict:
    """
    硬删除单个网站及其关联数据（Prefect Task）
    
    Args:
        website_id: 网站ID
        website_name: 网站名称
    
    Returns:
        删除结果字典
    """
    import time
    from apps.asset.services.website_service import WebSiteService
    
    close_old_connections()
    start_time = time.time()
    
    try:
        logger.info(f"🔵 开始删除网站: {website_name} (ID: {website_id})")
        
        service = WebSiteService()
        deleted_count, details = service.hard_delete_websites([website_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'website_id': website_id,
            'website_name': website_name,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成: {website_name} - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 删除失败: {website_name} - 错误: {e}, 耗时 {execution_time:.2f}s", 
            exc_info=True
        )
        raise
        
    finally:
        close_old_connections()


__all__ = ['hard_delete_website_task']
