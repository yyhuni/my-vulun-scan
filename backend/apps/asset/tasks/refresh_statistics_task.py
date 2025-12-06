"""
资产统计刷新任务模块

负责刷新资产统计数据（Prefect Task）

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


@task(name="refresh-asset-statistics", retries=2, retry_delay_seconds=30)
def refresh_statistics_task() -> Dict:
    """
    刷新资产统计数据任务（Prefect Task）
    
    执行实际的 COUNT 查询并更新统计表
    
    Returns:
        统计结果字典 {
            'success': bool,
            'total_targets': int,
            'total_assets': int,
            'total_vulns': int,
            'execution_time': float
        }
    
    Note:
        - 此 Task 会被 Prefect 调度执行
        - 失败会自动重试，超过重试次数后抛出异常
    """
    import time
    from apps.asset.services import AssetStatisticsService
    
    # 关闭旧的数据库连接（新 Task 需要新连接）
    close_old_connections()
    
    start_time = time.time()
    
    try:
        logger.info("🔵 开始刷新资产统计")
        
        service = AssetStatisticsService()
        stats = service.refresh_statistics()
        
        execution_time = time.time() - start_time
        
        result = {
            'success': True,
            'total_targets': stats.total_targets,
            'total_subdomains': stats.total_subdomains,
            'total_ips': stats.total_ips,
            'total_endpoints': stats.total_endpoints,
            'total_websites': stats.total_websites,
            'total_vulns': stats.total_vulns,
            'total_assets': stats.total_assets,
            'updated_at': stats.updated_at.isoformat() if stats.updated_at else None,
            'execution_time': round(execution_time, 2)
        }
        
        logger.info(
            f"✓ 统计刷新完成 - "
            f"目标: {stats.total_targets}, "
            f"资产: {stats.total_assets}, "
            f"漏洞: {stats.total_vulns}, "
            f"耗时: {execution_time:.2f}s"
        )
        
        return result
        
    except Exception as e:
        execution_time = time.time() - start_time
        logger.error(
            f"❌ 统计刷新失败 - 错误: {e}, 耗时 {execution_time:.2f}s",
            exc_info=True
        )
        raise
        
    finally:
        # 清理数据库连接
        close_old_connections()


__all__ = ['refresh_statistics_task']
