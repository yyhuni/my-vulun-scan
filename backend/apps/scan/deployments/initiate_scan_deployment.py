"""
扫描初始化任务的 Deployment 配置

用于异步提交扫描任务（非定时调度）

Prefect 3.x 版本
"""

# 导入 Flow
import sys
import os
# 添加项目根目录到 Python 路径（deployments 在 apps/scan/deployments，需要回到 backend/）
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.scan.flows.initiate_scan_flow import initiate_scan_flow


if __name__ == "__main__":
    """
    扫描初始化任务部署/服务 (Prefect 3.x)
    
    使用方法：
        方式 1 - 本地开发（推荐）:
            python apps/scan/deployments/initiate_scan_deployment.py
            (自动使用 serve 模式，持续运行)
        
        方式 2 - Docker 部署:
            export WORKER_MODE=docker
            python apps/scan/deployments/initiate_scan_deployment.py
            (使用 deploy 模式，需要启动 docker-compose)
    
    环境变量：
        WORKER_MODE: 'local'(默认) 或 'docker'
    """
    
    import os
    
    # 检查 Worker 运行模式
    worker_mode = os.getenv('WORKER_MODE', 'local').lower()
    use_docker = worker_mode == 'docker'
    
    print("=" * 60)
    print(f"  Flow: initiate_scan")
    print(f"  部署名称: initiate-scan-on-demand")
    
    if use_docker:
        # Docker 模式：使用 deploy()
        print(f"  模式: Docker Worker (deploy)")
        print(f"  镜像: xingrin-backend:local")
        print(f"  工作池: default")
        print("=" * 60)
        
        deployment_id = initiate_scan_flow.deploy(
            name="initiate-scan-on-demand",
            work_pool_name="default",
            description="按需触发的扫描初始化任务（通过 API 调用）",
            version="1.0.0",
            tags=["scan", "on-demand", "async"],
            image="xingrin-backend:local",
            cron=None,
            interval=None,
        )
        
        print(f"\n✓ 部署已创建: initiate-scan-on-demand")
        print(f"  Deployment ID: {deployment_id}")
        print(f"\n下一步:")
        print(f"  启动 Worker: cd docker/worker && docker-compose up -d")
    else:
        # 本地模式：使用 serve()
        print(f"  模式: 本地开发 (serve)")
        print(f"  调度: 按需触发（无定时调度）")
        print("=" * 60)
        print(f"\n服务持续运行中... (按 Ctrl+C 停止)")
        print(f"访问 Prefect UI: http://localhost:4200\n")
        
        initiate_scan_flow.serve(
            name="initiate-scan-on-demand",
            tags=["scan", "on-demand", "async"],
            description="按需触发的扫描初始化任务（通过 API 调用）",
        )
