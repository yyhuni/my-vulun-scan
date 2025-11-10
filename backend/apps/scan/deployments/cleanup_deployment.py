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
    
    使用方法：
        方式 1 - 本地开发（推荐）:
            python apps/scan/deployments/cleanup_deployment.py
            (自动使用 serve 模式，持续运行)
        
        方式 2 - Docker 部署:
            export WORKER_MODE=docker
            python apps/scan/deployments/cleanup_deployment.py
            (使用 deploy 模式，需要启动 docker-compose)
    
    环境变量：
        WORKER_MODE: 'local'(默认) 或 'docker'
    """
    
    import os
    
    # 检查 Worker 运行模式
    worker_mode = os.getenv('WORKER_MODE', 'local').lower()
    use_docker = worker_mode == 'docker'
    
    print("=" * 60)
    print(f"  Flow: cleanup_old_scans")
    print(f"  部署名称: cleanup-old-scans-daily")
    
    if use_docker:
        # Docker 模式：使用 deploy()
        print(f"  模式: Docker Worker (deploy)")
        print(f"  镜像: xingrin-backend:local")
        print(f"  调度: 每天凌晨2:00 (服务器本地时间)")
        print(f"  工作池: default")
        print("=" * 60)
        
        # 注意：cron 基于服务器本地时间
        deployment_id = cleanup_old_scans_flow.deploy(
            name="cleanup-old-scans-daily",
            work_pool_name="default",
            description="每天凌曨定时清理超过保留期限的扫描结果目录",
            version="1.0.0",
            tags=["maintenance", "cleanup", "scheduled"],
            image="xingrin-backend:local",
            cron="0 2 * * *",  # 服务器本地时间凌晨2:00
        )
        
        print(f"\n✓ 部署已创建: cleanup-old-scans-daily")
        print(f"  Deployment ID: {deployment_id}")
        print(f"\n下一步:")
        print(f"  启动 Worker: cd docker/worker && docker-compose up -d")
    else:
        # 本地模式：使用 serve()
        print(f"  模式: 本地开发 (serve)")
        print(f"  调度: 每天凌晨2:00 (UTC+8 时区请使用 cron: 0 18 * * *)")
        print("=" * 60)
        print(f"\n服务持续运行中... (按 Ctrl+C 停止)")
        print(f"访问 Prefect UI: http://localhost:4200\n")
        
        # 注意：serve() 不支持 timezone 参数
        # 如需使用 Asia/Shanghai 时区的凌晨2:00，请使用 UTC 时间 18:00 (前一天)
        # 或者使用 cron="0 2 * * *" 基于服务器本地时间
        cleanup_old_scans_flow.serve(
            name="cleanup-old-scans-daily",
            tags=["maintenance", "cleanup", "scheduled"],
            description="每天凌曨定时清理超过保留期限的扫描结果目录",
            cron="0 2 * * *",  # 服务器本地时间凌晨2:00
        )
