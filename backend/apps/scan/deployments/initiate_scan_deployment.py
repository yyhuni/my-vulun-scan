"""
扫描初始化任务的 Deployment 配置

用于异步提交扫描任务（非定时调度）

Prefect 3.x 版本
"""

from django.conf import settings
from apps.scan.flows.initiate_scan_flow import initiate_scan_flow


def create_scan_deployment():
    """
    创建扫描初始化任务的 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    # 扫描初始化任务使用扫描工作池
    work_pool_name = settings.PREFECT_SCAN_WORK_POOL_NAME
    
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


if __name__ == "__main__":
    deployment = create_scan_deployment()
    deployment.apply()
    print("Success: initiate-scan-on-demand deployment applied")
