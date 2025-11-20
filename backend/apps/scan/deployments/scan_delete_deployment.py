"""
Scan 删除任务的 Deployment 配置

用于异步删除扫描任务（两阶段删除）

Prefect 3.x 版本
"""

import os
from apps.scan.flows.scan_delete_flow import delete_scans_flow


def create_scan_delete_deployment():
    """
    创建 Scan 删除任务 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return delete_scans_flow.from_source(
        source=".",
        entrypoint="apps/scan/flows/scan_delete_flow.py:delete_scans_flow"
    ).to_deployment(
        name="delete-scans-on-demand",
        work_pool_name=work_pool_name,
        tags=["scan", "delete", "on-demand", "async"],
        description="批量删除扫描任务（两阶段删除）",
    )


__all__ = ['create_scan_delete_deployment']
