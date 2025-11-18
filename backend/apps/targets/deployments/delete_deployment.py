"""
删除任务的 Prefect Deployment 创建脚本

创建目标和组织删除任务的 Deployments，使用分离模式部署到 Prefect Server
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from apps.targets.flows.delete_targets_flow import delete_targets_flow
from apps.targets.flows.delete_organizations_flow import delete_organizations_flow


def create_deployments():
    """
    创建删除任务的 Deployments (分离模式)
    
    使用分离模式，Deployment 注册到 Prefect Server
    需要独立的 Worker 来执行任务
    """
    
    print("=" * 60)
    print("  创建targets删除任务 Deployments (分离模式)")
    print("=" * 60)
    
    # 获取工作池名称（从环境变量）
    work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
    
    # 使用 flow.deploy() 方法创建分离模式部署
    print("\n正在创建并部署 Deployments 到 Prefect Server...")
    
    # 部署目标删除 Flow - 使用 from_source 方法
    print("\n1. 部署 delete-targets...")
    delete_targets_flow.from_source(
        source=".",  # 使用当前目录作为源代码位置
        entrypoint="apps/targets/flows/delete_targets_flow.py:delete_targets_flow"
    ).deploy(
        name="delete-targets",
        work_pool_name=work_pool_name,
        tags=["targets", "delete", "maintenance"],
        description="批量删除目标及其关联数据（软删除后的硬删除）",
    )
    
    # 部署组织删除 Flow - 使用 from_source 方法
    print("2. 部署 delete-organizations...")
    delete_organizations_flow.from_source(
        source=".",  # 使用当前目录作为源代码位置
        entrypoint="apps/targets/flows/delete_organizations_flow.py:delete_organizations_flow"
    ).deploy(
        name="delete-organizations",
        work_pool_name=work_pool_name,
        tags=["organizations", "delete", "maintenance"],
        description="批量删除组织及其关联数据（软删除后的硬删除）",
    )
    
    print(f"  创建 Flow 1: delete-targets")
    print(f"  创建 Flow 2: delete-organizations")
    print(f"  部署模式: 分离模式 (传统部署)")
    print(f"  目标工作池: {work_pool_name}")
    print(f"  触发方式: 按需调用（API触发）")
    print("=" * 60)
    
    print("✅ 所有 Deployments 部署成功！")
    
    print(f"\n🎉 所有 Deployments 部署完成！")
    print(f"📋 管理命令:")
    print(f"  查看 Deployments: prefect deployment ls")
    print(f"  启动 Worker: prefect worker start --pool {work_pool_name}")
    print(f"  访问 Prefect UI: http://localhost:4200")
    return True


if __name__ == "__main__":
    """
    创建并部署删除任务 Deployments 到 Prefect Server
    
    运行此脚本将：
    1. 创建 delete-targets Deployment
    2. 创建 delete-organizations Deployment  
    3. 将两个 Deployments 注册到 Prefect Server
    
    注意：需要先启动 Prefect Server 和对应的 Worker
    """
    success = create_deployments()
    if not success:
        exit(1)
