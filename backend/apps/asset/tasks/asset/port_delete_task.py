"""
端口删除任务模块

负责单个端口的硬删除（Prefect Task）
"""

import logging
from typing import Dict

from prefect import task
from django.db import close_old_connections

logger = logging.getLogger(__name__)


@task(name="hard-delete-port", retries=2, retry_delay_seconds=60)
def hard_delete_port_task(port_id: int) -> Dict:
    """
    硬删除单个端口及其关联数据（Prefect Task）
    
    Args:
        port_id: 端口ID
    
    Returns:
        删除结果字典
    """
    import time
    from apps.asset.services.port_service import PortService
    
    close_old_connections()
    start_time = time.time()
    
    try:
        logger.info(f"🔵 开始删除端口 (ID: {port_id})")
        
        service = PortService()
        deleted_count, details = service.hard_delete_ports([port_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'port_id': port_id,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成 (ID: {port_id}) - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 删除失败 (ID: {port_id}) - 错误: {e}, 耗时 {execution_time:.2f}s", 
            exc_info=True
        )
        raise
        
    finally:
        close_old_connections()


__all__ = ['hard_delete_port_task']
