"""
子域名删除任务模块

负责单个子域名的硬删除（Prefect Task）

特点：
- 自动重试机制
- 详细的进度日志
- 数据库连接管理
"""

import logging
from typing import Dict

from prefect import task
from django.db import close_old_connections

logger = logging.getLogger(__name__)


@task(name="hard-delete-subdomain", retries=2, retry_delay_seconds=60)
def hard_delete_subdomain_task(subdomain_id: int) -> Dict:
    """
    硬删除单个子域名及其关联数据（Prefect Task）
    
    Args:
        subdomain_id: 子域名ID
    
    Returns:
        删除结果字典 {
            'success': bool,
            'subdomain_id': int,
            'deleted_count': int,
            'execution_time': float
        }
    
    Strategy:
        使用数据库级 CASCADE 删除 + Prefect 异步管理
    
    Note:
        - 此Task会被Prefect调度执行
        - 失败会自动重试，超过重试次数后抛出异常
    """
    import time
    from apps.asset.services import SubdomainService
    
    # 关闭旧的数据库连接（新Task需要新连接）
    close_old_connections()
    
    start_time = time.time()
    
    try:
        logger.info(f"🔵 开始删除子域名 (ID: {subdomain_id})")
        logger.info(f"   策略: 数据库级 CASCADE 删除")
        
        # 调用Service层执行删除（使用数据库 CASCADE）
        service = SubdomainService()
        deleted_count, details = service.hard_delete_subdomains([subdomain_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'subdomain_id': subdomain_id,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成 (ID: {subdomain_id}) - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 删除失败 (ID: {subdomain_id}) - {e}",
            exc_info=True
        )
        return {
            'success': False,
            'subdomain_id': subdomain_id,
            'error': str(e),
            'execution_time': round(execution_time, 2)
        }


# 导出接口
__all__ = ['hard_delete_subdomain_task']
