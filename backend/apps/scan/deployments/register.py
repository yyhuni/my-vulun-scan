"""
注册 Scan 删除任务 Deployment

此脚本用于注册 Scan 删除任务的 Prefect Deployment。
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent
sys.path.append(str(BACKEND_DIR))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from prefect import serve
from apps.scan.flows.scan_delete_flow import delete_scans_flow

def create_scan_delete_deployment():
    """创建 Scan 删除任务 Deployment"""
    
    # 创建 Deployment
    deployment = delete_scans_flow.to_deployment(
        name="delete-scans",
        version="1.0.0",
        tags=["scan", "delete"],
        parameters={
            "scan_ids": [],
            "scan_names": []
        }
    )
    
    return deployment

if __name__ == "__main__":
    print("=" * 60)
    print("  注册 Scan Deployments")
    print("=" * 60)

    try:
        # 获取工作池名称
        work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
        
        # 注册 Deployment
        deployment = create_scan_delete_deployment()
        
        # 应用 Deployment
        deployment_id = deployment.apply()
        
        print(f"✅ Scan 删除任务 Deployment 部署成功！")
        print(f"  - ID: {deployment_id}")
        print(f"  - 名称: delete-scans/delete-scans")
        print(f"  目标工作池: {work_pool_name}")
        
    except Exception as e:
        print(f"\n❌ 注册失败: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
