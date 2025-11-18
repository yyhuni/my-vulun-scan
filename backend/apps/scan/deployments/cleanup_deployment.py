"""
清理扫描结果的定时任务部署配置

使用 Prefect Deployments 和 Cron Schedule 实现定时清理

Prefect 3.x 版本
"""

# 导入清理任务 Flow
import sys
import os
# 添加项目根目录到 Python 路径（deployments 在 apps/scan/deployments，需要回到 backend/）
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.scan.tasks.cleanup_old_scans_task import cleanup_old_scans_flow


def create_cleanup_deployment():
    """
    创建清理任务的 Deployment (分离模式)
    
    使用分离模式，Deployment 注册到 Prefect Server
    需要独立的 Worker 来执行任务
    """
    
    print("=" * 60)
    print("  创建清理任务 Deployment (分离模式)")
    print("=" * 60)
    
    # 获取工作池名称（从环境变量）
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    # 使用 from_source 方法创建分离模式部署
    print("\n正在创建并部署 Deployment 到 Prefect Server...")
    
    # 部署清理任务 Flow
    print("\n1. 部署 cleanup-old-scans-daily...")
    cleanup_old_scans_flow.from_source(
        source=".",  # 使用当前目录作为源代码位置
        entrypoint="apps/scan/tasks/cleanup_old_scans_task.py:cleanup_old_scans_flow"
    ).deploy(
        name="cleanup-old-scans-daily",
        work_pool_name=work_pool_name,
        tags=["maintenance", "cleanup", "scheduled"],
        description="每天凌晨定时清理超过保留期限的扫描结果目录",
        cron="0 2 * * *",  # 服务器本地时间凌晨2:00
    )
    
    print(f"  创建 Flow: cleanup-old-scans-daily")
    print(f"  部署模式: 分离模式 (传统部署)")
    print(f"  目标工作池: {work_pool_name}")
    print(f"  触发方式: 定时调度（每天凌晨2:00）")
    print("=" * 60)
    
    print("✅ 清理任务 Deployment 部署成功！")
    
    print(f"\n🎉 清理任务 Deployment 部署完成！")
    print(f"📋 管理命令:")
    print(f"  查看 Deployments: prefect deployment ls")
    print(f"  启动 Worker: prefect worker start --pool {work_pool_name}")
    print(f"  访问 Prefect UI: http://localhost:4200")
    
    return True


if __name__ == "__main__":
    """
    创建并部署清理任务 Deployment 到 Prefect Server
    
    运行此脚本将：
    1. 创建 cleanup-old-scans-daily Deployment
    2. 将 Deployment 注册到 Prefect Server
    3. 设置定时调度（每天凌晨2:00）
    
    注意：需要先启动 Prefect Server 和对应的 Worker
    """
    success = create_cleanup_deployment()
    if not success:
        exit(1)
