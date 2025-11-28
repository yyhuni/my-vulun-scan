"""
Target 删除 Deployment 配置

创建单个 Target 删除任务的 Deployment
"""

from django.conf import settings
from apps.targets.flows.delete_targets_flow import delete_targets_flow


def create_target_deployment():
    """
    创建 Target 删除 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    # Target 删除任务使用维护工作池
    work_pool_name = settings.PREFECT_MAINTENANCE_WORK_POOL_NAME
    
    return delete_targets_flow.from_source(
        source=".",
        entrypoint="apps/targets/flows/delete_targets_flow.py:delete_targets_flow"
    ).to_deployment(
        name="delete-targets-on-demand",
        work_pool_name=work_pool_name,
        tags=["targets", "delete", "on-demand", "maintenance"],
        description="批量删除目标及其关联数据（软删除后的硬删除）",
    )


__all__ = ['create_target_deployment']
