#!/usr/bin/env python
"""
Asset Deployments 注册器

统一注册所有 Asset 相关的 Deployments
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.conf import settings

from .statistics_deployment import create_statistics_deployment


def register_all_deployments():
    """
    注册所有 Asset Deployments
    
    Returns:
        bool: 是否注册成功
    """
    print("=" * 60)
    print("  注册 Asset Deployments")
    print("=" * 60)
    
    try:
        # 获取维护工作池名称
        maintenance_pool_name = settings.PREFECT_MAINTENANCE_WORK_POOL_NAME
        
        # 1. 部署资产统计刷新 Deployment
        print("\n1. 部署 refresh-asset-statistics-hourly...")
        stats_deployment = create_statistics_deployment()
        stats_deployment.apply()
        print("   ✅ refresh-asset-statistics-hourly 部署成功")
        
        print("\n" + "=" * 60)
        print("✅ 所有 Asset Deployments 注册成功！")
        print("=" * 60)
        print("Success: All Asset Deployments registered")
        
        print("\n📋 部署信息:")
        print(f"  - refresh-asset-statistics-hourly (每小时) -> 池: {maintenance_pool_name}")
        print(f"\n🎯 管理命令:")
        print(f"  查看 Deployments: prefect deployment ls")
        print(f"  启动维护 Worker: prefect worker start --pool {maintenance_pool_name}")
        print(f"  访问 Prefect UI: http://localhost:4200")
        
        return True
        
    except Exception as e:
        print(f"\n❌ 注册失败: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    """
    注册所有 Asset Deployments
    
    运行此脚本将注册：
    1. refresh-asset-statistics-hourly - 资产统计刷新 Deployment（每小时）
    
    注意：需要先启动 Prefect Server
    """
    success = register_all_deployments()
    if not success:
        exit(1)
