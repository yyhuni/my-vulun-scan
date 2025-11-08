"""
清理扫描结果的定时任务部署配置

使用 Prefect Deployments 和 Cron Schedule 实现定时清理
"""

from prefect.deployments import Deployment
from prefect.server.schemas.schedules import CronSchedule

# 导入清理任务 Flow
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.scan.tasks.cleanup_old_scans_task import cleanup_old_scans_flow


def create_cleanup_deployment():
    """
    创建清理任务的 Deployment
    
    配置说明：
    - 每天凌晨 2:00 执行（亚洲/上海时区）
    - 使用默认工作池（default）
    - 保留最近的部署历史
    """
    deployment = Deployment.build_from_flow(
        flow=cleanup_old_scans_flow,
        name="cleanup-old-scans-daily",
        description="每天凌晨定时清理超过保留期限的扫描结果目录",
        version="1.0.0",
        tags=["maintenance", "cleanup", "scheduled"],
        
        # 定时调度：每天凌晨 2:00
        schedule=CronSchedule(
            cron="0 2 * * *",
            timezone="Asia/Shanghai"
        ),
        
        # 工作池配置
        work_pool_name="default",
        
        # 部署配置
        is_schedule_active=True,  # 启用定时调度
    )
    
    return deployment


if __name__ == "__main__":
    """
    执行此脚本以创建或更新部署
    
    使用方法：
        python deployments/cleanup_deployment.py
    """
    deployment = create_cleanup_deployment()
    
    # 应用部署
    deployment_id = deployment.apply()
    
    print(f"✓ 部署已创建/更新: {deployment.name}")
    print(f"  Deployment ID: {deployment_id}")
    print(f"  调度: 每天凌晨 2:00 (Asia/Shanghai)")
    print(f"  工作池: default")
    print(f"  状态: {'启用' if deployment.is_schedule_active else '禁用'}")

