"""
IP地址删除任务模块

负责单个IP地址的硬删除（Prefect Task）
"""

import logging
from typing import Dict

from prefect import task
from django.db import close_old_connections

logger = logging.getLogger(__name__)


@task(name="hard-delete-ip_address", retries=2, retry_delay_seconds=60)
def hard_delete_ip_address_task(ip_address_id: int, ip_address_name: str) -> Dict:
    """
    硬删除单个IP地址及其关联数据（Prefect Task）
    
    Args:
        ip_address_id: IP地址ID
        ip_address_name: IP地址名称
    
    Returns:
        删除结果字典
    """
    import time
    from apps.asset.services.ip_address_service import IPAddressService
    
    close_old_connections()
    start_time = time.time()
    
    try:
        logger.info(f"🔵 开始删除IP地址: {ip_address_name} (ID: {ip_address_id})")
        
        service = IPAddressService()
        deleted_count, details = service.hard_delete_ip_addresses([ip_address_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'ip_address_id': ip_address_id,
            'ip_address_name': ip_address_name,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成: {ip_address_name} - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 删除失败: {ip_address_name} - 错误: {e}, 耗时 {execution_time:.2f}s", 
            exc_info=True
        )
        raise
        
    finally:
        close_old_connections()


__all__ = ['hard_delete_ip_address_task']
