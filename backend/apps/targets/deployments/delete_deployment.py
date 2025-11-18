"""
删除任务的 Prefect Deployment 配置（合并版）

在一个进程中同时服务目标和组织的删除任务
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from prefect import serve
from apps.targets.flows.delete_targets_flow import delete_targets_flow
from apps.targets.flows.delete_organizations_flow import delete_organizations_flow


if __name__ == "__main__":
    """
    删除任务部署/服务 (Prefect 3.x)
    
    使用本地开发模式，修改代码立即生效
    同时服务目标和组织的删除任务
    """
    
    print("=" * 60)
    print("  删除任务 Deployment (合并版)")
    print("=" * 60)
    print(f"  Flow 1: delete-targets")
    print(f"  Flow 2: delete-organizations")
    print(f"  模式: 本地开发 (serve)")
    print(f"  触发: 按需调用（API触发）")
    print(f"  并发限制: 每个 Flow 限制 3 个并发")
    print("=" * 60)
    print(f"\n服务持续运行中... (按 Ctrl+C 停止)")
    print(f"访问 Prefect UI: http://localhost:4200\n")
    
    # 同时服务两个 Flow
    serve(
        delete_targets_flow.to_deployment(
            name="delete-targets",
            tags=["targets", "delete", "maintenance"],
            description="批量删除目标及其关联数据（软删除后的硬删除）",
            work_pool_name=None,  # 本地开发模式
        ),
        delete_organizations_flow.to_deployment(
            name="delete-organizations",
            tags=["organizations", "delete", "maintenance"],
            description="批量删除组织及其关联数据（软删除后的硬删除）",
            work_pool_name=None,  # 本地开发模式
        ),
        limit=3,  # 全局并发限制：同时最多执行 3 个删除任务
    )
