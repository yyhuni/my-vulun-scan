"""
Organization 删除 Deployment 配置

创建单个 Organization 删除任务的 Deployment
"""

import os
from apps.targets.flows.delete_organizations_flow import delete_organizations_flow


def create_organization_deployment():
    """
    创建 Organization 删除 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return delete_organizations_flow.from_source(
        source=".",
        entrypoint="apps/targets/flows/delete_organizations_flow.py:delete_organizations_flow"
    ).to_deployment(
        name="delete-organizations",
        work_pool_name=work_pool_name,
        tags=["organizations", "delete", "maintenance"],
        description="批量删除组织及其关联数据（软删除后的硬删除）",
    )


__all__ = ['create_organization_deployment']
