"""
扫描初始化任务的 Deployment 配置

用于异步提交扫描任务（非定时调度）

Prefect 3.x 版本
"""

import os
from apps.scan.flows.initiate_scan_flow import initiate_scan_flow


def create_scan_deployment():
    """
    创建扫描初始化任务的 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return initiate_scan_flow.from_source(
        source=".",
        entrypoint="apps/scan/flows/initiate_scan_flow.py:initiate_scan_flow"
    ).to_deployment(
        name="initiate-scan-on-demand",
        work_pool_name=work_pool_name,
        tags=["scan", "on-demand", "async"],
        description="按需触发的扫描初始化任务（通过 API 调用）",
    )


__all__ = ['create_scan_deployment']
