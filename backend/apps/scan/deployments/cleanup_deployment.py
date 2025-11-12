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


if __name__ == "__main__":
    """
    清理任务部署/服务 (Prefect 3.x)
    
    使用本地开发模式，修改代码立即生效
    """
    
    print("=" * 60)
    print(f"  Flow: cleanup_old_scans")
    print(f"  部署名称: cleanup-old-scans-daily")
    print(f"  模式: 本地开发 (serve)")
    print(f"  调度: 每天凌晨2:00 (服务器本地时间)")
    print("=" * 60)
    print(f"\n服务持续运行中... (按 Ctrl+C 停止)")
    print(f"访问 Prefect UI: http://localhost:4200\n")
    
    # 使用服务器本地时间凌晨2:00执行清理任务
    cleanup_old_scans_flow.serve(
        name="cleanup-old-scans-daily",
        tags=["maintenance", "cleanup", "scheduled"],
        description="每天凌晨定时清理超过保留期限的扫描结果目录",
        cron="0 2 * * *",  # 服务器本地时间凌晨2:00
    )
