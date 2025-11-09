"""
清理扫描结果的定时任务部署配置

使用 Prefect Deployments 和 Cron Schedule 实现定时清理

Prefect 3.x 版本
"""

# 导入清理任务 Flow
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.scan.tasks.cleanup_old_scans_task import cleanup_old_scans_flow


if __name__ == "__main__":
    """
    启动清理任务的服务 (Prefect 3.x)
    
    使用方法：
        python deployments/cleanup_deployment.py
    
    配置说明：
    - 本地开发模式（使用 serve）
    - 每天凌晨2:00 执行（亚洲/上海时区）
    - 自动定时调度
    
    注意：
    - serve() 会启动一个持续运行的进程
    - 需要保持脚本运行以执行定时任务
    - 生产环境应使用 deploy() + Docker
    """
    
    # Prefect 3.x 本地开发推荐：使用 flow.serve()
    print("正在启动 cleanup_old_scans Flow 服务...")
    print("=" * 60)
    print("  Flow: cleanup_old_scans")
    print("  模式: 本地开发服务（持续运行）")
    print("  调度: 每天凌晨2:00 (Asia/Shanghai)")
    print("  触发方式: 自动定时执行")
    print("=" * 60)
    print("\n按 Ctrl+C 停止服务\n")
    
    cleanup_old_scans_flow.serve(
        name="cleanup-old-scans-daily",
        tags=["maintenance", "cleanup", "scheduled"],
        description="每天凌曨定时清理超过保留期限的扫描结果目录",
        cron="0 2 * * *",
        timezone="Asia/Shanghai",
    )
