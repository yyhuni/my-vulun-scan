"""
IPAddress 删除 Deployment 配置

创建单个 IPAddress 删除任务的 Deployment
"""

import os
from apps.asset.flows import delete_ip_addresses_flow


def create_ip_address_deployment():
    """
    创建 IPAddress 删除 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return delete_ip_addresses_flow.from_source(
        source=".",
        entrypoint="apps/asset/flows/asset/ip_address_delete_flow.py:delete_ip_addresses_flow"
    ).to_deployment(
        name="delete-ip-addresses-on-demand",
        work_pool_name=work_pool_name,
        tags=["asset", "ip_address", "delete", "on-demand", "maintenance"],
        description="批量删除IP地址及其关联数据（软删除后的硬删除）",
    )


__all__ = ['create_ip_address_deployment']
