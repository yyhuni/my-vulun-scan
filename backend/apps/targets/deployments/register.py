#!/usr/bin/env python
"""
Targets Deployments 注册器

统一注册所有 Targets 相关的 Deployments
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from .target_deployment import create_target_deployment
from .organization_deployment import create_organization_deployment


def register_all_deployments():
    """
    注册所有 Targets Deployments
    
    Returns:
        bool: 是否注册成功
    """
    print("=" * 60)
    print("  注册 Targets Deployments")
    print("=" * 60)
    
    try:
        # 获取工作池名称
        work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
        
        # 1. 部署 Target 删除 Deployment
        print("\n1. 部署 delete-targets-on-demand...")
        target_deployment = create_target_deployment()
        target_deployment.apply()
        print("   ✅ delete-targets-on-demand 部署成功")
        
        # 2. 部署 Organization 删除 Deployment
        print("\n2. 部署 delete-organizations-on-demand...")
        org_deployment = create_organization_deployment()
        org_deployment.apply()
        print("   ✅ delete-organizations-on-demand 部署成功")
        
        print("\n" + "=" * 60)
        print("✅ 所有 Targets Deployments 注册成功！")
        print("=" * 60)
        
        print(f"\n📋 部署信息:")
        print(f"  - delete-targets-on-demand (按需删除)")
        print(f"  - delete-organizations-on-demand (按需删除)")
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
    注册所有 Targets Deployments
    
    运行此脚本将注册：
    1. delete-targets-on-demand - 目标删除 Deployment（按需）
    2. delete-organizations-on-demand - 组织删除 Deployment（按需）
    
    注意：需要先启动 Prefect Server
    """
    success = register_all_deployments()
    if not success:
        exit(1)
