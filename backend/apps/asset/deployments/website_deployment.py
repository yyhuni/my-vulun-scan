"""
WebSite 删除 Deployment 配置

创建单个 WebSite 删除任务的 Deployment
"""

import os
from apps.asset.flows.website_delete_flow import delete_websites_flow


def create_website_deployment():
    """
    创建 WebSite 删除 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return delete_websites_flow.from_source(
        source=".",
        entrypoint="apps/asset/flows/website_delete_flow.py:delete_websites_flow"
    ).to_deployment(
        name="delete-websites",
        work_pool_name=work_pool_name,
        tags=["asset", "website", "delete", "maintenance"],
        description="批量删除网站及其关联数据（软删除后的硬删除）",
    )


__all__ = ['create_website_deployment']
