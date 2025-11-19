"""
Subdomain 删除 Deployment 配置

创建单个 Subdomain 删除任务的 Deployment
"""

import os
from apps.asset.flows.subdomain_delete_flow import delete_subdomains_flow


def create_subdomain_deployment():
    """
    创建 Subdomain 删除 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return delete_subdomains_flow.from_source(
        source=".",
        entrypoint="apps/asset/flows/subdomain_delete_flow.py:delete_subdomains_flow"
    ).to_deployment(
        name="delete-subdomains",
        work_pool_name=work_pool_name,
        tags=["asset", "subdomain", "delete", "maintenance"],
        description="批量删除子域名及其关联数据（软删除后的硬删除）",
    )


__all__ = ['create_subdomain_deployment']
