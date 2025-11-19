"""
清理扫描结果的定时任务部署配置

使用 Prefect Deployments 和 Cron Schedule 实现定时清理

Prefect 3.x 版本
"""

import os
from apps.scan.tasks.cleanup_old_scans_task import cleanup_old_scans_flow


def create_cleanup_deployment():
    """
    创建清理任务的 Deployment
    
    Returns:
        Deployment 对象（已配置但未部署）
    """
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    return cleanup_old_scans_flow.from_source(
        source=".",
        entrypoint="apps/scan/tasks/cleanup_old_scans_task.py:cleanup_old_scans_flow"
    ).to_deployment(
        name="cleanup-old-scans-daily",
        work_pool_name=work_pool_name,
        tags=["maintenance", "cleanup", "scheduled"],
        description="每天凌晨定时清理超过保留期限的扫描结果目录",
        cron="0 2 * * *",  # 服务器本地时间凌晨２：００
    )


__all__ = ['create_cleanup_deployment']
