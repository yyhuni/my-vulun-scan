"""
资产统计刷新流程

使用 Prefect 定时刷新资产统计数据
"""

import logging

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow

from apps.asset.tasks.refresh_statistics_task import refresh_statistics_task

logger = logging.getLogger(__name__)


@flow(
    name="refresh-asset-statistics",
    log_prints=True,
    retries=1,
    retry_delay_seconds=60
)
def refresh_asset_statistics_flow() -> dict:
    """
    资产统计刷新 Prefect Flow
    
    定时执行，刷新仪表盘统计数据。
    建议每小时执行一次。
    
    Returns:
        刷新结果
    """
    logger.info("🔄 开始刷新资产统计...")
    
    try:
        result = refresh_statistics_task()
        
        logger.info(
            f"✓ 资产统计刷新完成 - "
            f"目标: {result['total_targets']}, "
            f"资产: {result['total_assets']}, "
            f"漏洞: {result['total_vulns']}"
        )
        
        return result
        
    except Exception as e:
        logger.exception("❌ 资产统计刷新失败")
        return {
            'success': False,
            'error': str(e)
        }


__all__ = ['refresh_asset_statistics_flow']
