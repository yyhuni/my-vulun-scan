"""
组织删除任务模块

负责单个组织的硬删除（Prefect Task）

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


@task(name="hard-delete-organization", retries=2, retry_delay_seconds=60)
def hard_delete_organization_task(organization_id: int) -> Dict:
    """
    硬删除单个组织及其关联数据（Prefect Task）
    
    Args:
        organization_id: 组织ID
    
    Returns:
        删除结果字典 {
            'success': bool,
            'organization_id': int,
            'deleted_count': int,
            'execution_time': float,
        }
    
    特点：
    - 自动重试2次（失败后等待60秒）
    - 自动管理数据库连接
    - 详细的进度日志
    
    Note:
        - 此Task会被Prefect调度执行
        - 失败会自动重试，超过重试次数后抛出异常
    """
    from apps.targets.services.organization_service import OrganizationService
    
    # 关闭旧的数据库连接（新Task需要新连接）
    close_old_connections()
    
    try:
        logger.info(f"🔵 开始删除组织 (ID: {organization_id})")
        
        start_time = time.time()
        
        # 调用Service层执行删除
        service = OrganizationService()
        deleted_count, details = service.hard_delete_organizations([organization_id])
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'organization_id': organization_id,
            'deleted_count': deleted_count,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 删除完成 (ID: {organization_id}) - 删除 {deleted_count:,} 条记录，耗时 {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ 删除失败: {organization_id} - 错误: {e}", exc_info=True)
        raise
        
    finally:
        # 清理数据库连接
        close_old_connections()


# 导出接口
__all__ = ['hard_delete_organization_task']
