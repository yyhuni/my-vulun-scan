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

from .subdomain_deployment import create_subdomain_deployment
from .website_deployment import create_website_deployment
from .ip_address_deployment import create_ip_address_deployment
from .port_deployment import create_port_deployment
from .directory_deployment import create_directory_deployment


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
        # 获取工作池名称
        work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
        
        # 1. 部署 Subdomain 删除 Deployment
        print("\n1. 部署 delete-subdomains...")
        subdomain_deployment = create_subdomain_deployment()
        subdomain_deployment.deploy(
            name="delete-subdomains",
            work_pool_name=work_pool_name,
        )
        print("   ✅ delete-subdomains 部署成功")
        
        # 2. 部署 WebSite 删除 Deployment
        print("\n2. 部署 delete-websites...")
        website_deployment = create_website_deployment()
        website_deployment.deploy(
            name="delete-websites",
            work_pool_name=work_pool_name,
        )
        print("   ✅ delete-websites 部署成功")
        
        # 3. 部署 IPAddress 删除 Deployment
        print("\n3. 部署 delete-ip-addresses...")
        ip_deployment = create_ip_address_deployment()
        ip_deployment.deploy(
            name="delete-ip-addresses",
            work_pool_name=work_pool_name,
        )
        print("   ✅ delete-ip-addresses 部署成功")
        
        # 4. 部署 Port 删除 Deployment
        print("\n4. 部署 delete-ports...")
        port_deployment = create_port_deployment()
        port_deployment.deploy(
            name="delete-ports",
            work_pool_name=work_pool_name,
        )
        print("   ✅ delete-ports 部署成功")
        
        # 5. 部署 Directory 删除 Deployment
        print("\n5. 部署 delete-directories...")
        directory_deployment = create_directory_deployment()
        directory_deployment.deploy(
            name="delete-directories",
            work_pool_name=work_pool_name,
        )
        print("   ✅ delete-directories 部署成功")
        
        print("\n" + "=" * 60)
        print("✅ 所有 Asset Deployments 注册成功！")
        print("=" * 60)
        
        print(f"\n📋 部署信息:")
        print(f"  - delete-subdomains")
        print(f"  - delete-websites")
        print(f"  - delete-ip-addresses")
        print(f"  - delete-ports")
        print(f"  - delete-directories")
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
    注册所有 Asset Deployments
    
    运行此脚本将注册：
    1. delete-subdomains - 子域名删除 Deployment
    2. delete-websites - 网站删除 Deployment
    3. delete-ip-addresses - IP地址删除 Deployment
    4. delete-ports - 端口删除 Deployment
    5. delete-directories - 目录删除 Deployment
    
    注意：需要先启动 Prefect Server
    """
    success = register_all_deployments()
    if not success:
        exit(1)
