"""
资产统计刷新 Deployment 配置

创建资产统计定时刷新任务的 Deployment
"""

from django.conf import settings
from apps.asset.flows.refresh_statistics_flow import refresh_asset_statistics_flow


def create_statistics_deployment():
    """
    创建资产统计刷新 Deployment
    
    配置为每小时执行一次
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    # 使用维护工作池
    work_pool_name = settings.PREFECT_MAINTENANCE_WORK_POOL_NAME
    
    return refresh_asset_statistics_flow.from_source(
        source=".",
        entrypoint="apps/asset/flows/refresh_statistics_flow.py:refresh_asset_statistics_flow"
    ).to_deployment(
        name="refresh-asset-statistics-hourly",
        work_pool_name=work_pool_name,
        tags=["asset", "statistics", "scheduled", "maintenance"],
        description="定时刷新资产统计数据（每小时执行）",
        cron="0 * * * *",  # 每小时整点执行
    )


__all__ = ['create_statistics_deployment']
