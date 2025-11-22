"""
目录删除任务模块

负责单个目录的硬删除（Prefect Task）
"""

import logging
from typing import Dict

from prefect import task
from django.db import close_old_connections

logger = logging.getLogger(__name__)


@task(name="hard-delete-directory", retries=2, retry_delay_seconds=60)
def hard_delete_directory_task(directory_id: int, directory_name: str) -> Dict:
    """
    硬删除单个目录及其关联数据（Prefect Task）
    
    Args:
        directory_id: 目录ID
        directory_name: 目录名称
    
    Returns:
        删除结果字典
    """
    import time
    from apps.asset.services.directory_service import DirectoryService
    
    close_old_connections()
    start_time = time.time()
    
    try:
        logger.info(f"🔵 开始删除目录: {directory_name} (ID: {directory_id})")
        
        service = DirectoryService()
        deleted_count, details = service.hard_delete_directories([directory_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'directory_id': directory_id,
            'directory_name': directory_name,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成: {directory_name} - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 删除失败: {directory_name} - 错误: {e}, 耗时 {execution_time:.2f}s", 
            exc_info=True
        )
        raise
        
    finally:
        close_old_connections()


__all__ = ['hard_delete_directory_task']
