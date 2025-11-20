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

from .initiate_scan_deployment import create_scan_deployment
from .cleanup_deployment import create_cleanup_deployment
from .scan_delete_deployment import create_scan_delete_deployment


def register_all_deployments():
    """
    注册所有 Scan Deployments
    
    Returns:
        bool: 是否注册成功
    """
    print("=" * 60)
    print("  注册 Scan Deployments")
    print("=" * 60)
    
    try:
        # 获取工作池名称
        work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
        
        # 1. 部署扫描初始化 Deployment
        print("\n1. 部署 initiate-scan-on-demand...")
        scan_deployment = create_scan_deployment()
        scan_deployment.apply()
        print("   ✅ initiate-scan-on-demand 部署成功")
        
        # 2. 部署清理任务 Deployment
        print("\n2. 部署 cleanup-old-scans-daily...")
        cleanup_deployment = create_cleanup_deployment()
        cleanup_deployment.apply()
        print("   ✅ cleanup-old-scans-daily 部署成功")
        
        # 3. 部署 Scan 删除 Deployment
        print("\n3. 部署 delete-scans-on-demand...")
        delete_deployment = create_scan_delete_deployment()
        delete_deployment.apply()
        print("   ✅ delete-scans-on-demand 部署成功")
        
        print("\n" + "=" * 60)
        print("✅ 所有 Scan Deployments 注册成功！")
        print("=" * 60)
        
        print(f"\n📋 部署信息:")
        print(f"  - initiate-scan-on-demand (按需扫描)")
        print(f"  - cleanup-old-scans-daily (定时清理，每天凌晨2:00)")
        print(f"  - delete-scans-on-demand (按需删除)")
        print(f"  目标工作池: {work_pool_name}")
        print(f"\n🎯 管理命令:")
        print(f"  查看 Deployments: prefect deployment ls")
        print(f"  启动 Worker: prefect worker start --pool {work_pool_name}")
        print(f"  访问 Prefect UI: http://localhost:4200")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 注册失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    """
    注册所有 Scan Deployments
    
    运行此脚本将注册：
    1. initiate-scan-on-demand - 扫描初始化 Deployment（按需）
    2. cleanup-old-scans-daily - 清理任务 Deployment（定时）
    3. delete-scans-on-demand - Scan 删除 Deployment（按需）
    
    注意：需要先启动 Prefect Server
    """
    success = register_all_deployments()
    if not success:
        exit(1)
