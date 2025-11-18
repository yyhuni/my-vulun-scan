"""
目标删除任务模块

负责单个目标的硬删除（Prefect Task）

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


@task(name="hard-delete-target", retries=2, retry_delay_seconds=60)
def hard_delete_target_task(target_id: int, target_name: str) -> Dict:
    """
    硬删除单个目标及其关联数据（Prefect Task）
    
    Args:
        target_id: 目标ID
        target_name: 目标名称
    
    Returns:
        删除结果字典 {
            'success': bool,
            'target_id': int,
            'target_name': str,
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
    from apps.targets.services.target_service import TargetService
    
    # 关闭旧的数据库连接（新Task需要新连接）
    close_old_connections()
    
    start_time = time.time()
    
    try:
        logger.info(f"🔵 开始删除目标: {target_name} (ID: {target_id})")
        logger.info(f"   策略: 数据库级 CASCADE 删除")
        
        # 调用Service层执行删除（使用数据库 CASCADE）
        service = TargetService()
        deleted_count, details = service.hard_delete_targets([target_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'target_id': target_id,
            'target_name': target_name,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成: {target_name} - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 删除失败: {target_name} - 错误: {e}, 耗时 {execution_time:.2f}s", 
            exc_info=True
        )
        raise
        
    finally:
        # 清理数据库连接
        close_old_connections()


# 导出接口
__all__ = ['hard_delete_target_task']
