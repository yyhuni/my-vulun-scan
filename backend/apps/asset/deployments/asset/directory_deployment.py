"""
Directory 删除 Deployment 配置

创建单个 Directory 删除任务的 Deployment
"""

import os
from apps.asset.flows import delete_directories_flow


def create_directory_deployment():
    """
    创建 Directory 删除 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return delete_directories_flow.from_source(
        source=".",
        entrypoint="apps/asset/flows/asset/directory_delete_flow.py:delete_directories_flow"
    ).to_deployment(
        name="delete-directories-on-demand",
        work_pool_name=work_pool_name,
        tags=["asset", "directory", "delete", "on-demand", "maintenance"],
        description="批量删除目录及其关联数据（软删除后的硬删除）",
    )


__all__ = ['create_directory_deployment']
