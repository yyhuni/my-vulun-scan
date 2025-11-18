"""
目标删除任务的 Prefect Deployment 配置

使用 Prefect Serve 模式，按需执行删除任务
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


if __name__ == "__main__":
    """
    目标删除任务部署/服务 (Prefect 3.x)
    
    使用本地开发模式，修改代码立即生效
    按需执行，不需要 cron 调度
    """
    
    print("=" * 60)
    print(f"  Flow: delete-targets")
    print(f"  部署名称: delete-targets")
    print(f"  模式: 本地开发 (serve)")
    print(f"  触发: 按需调用（API触发）")
    print(f"  并发限制: 3 (同时最多执行3个删除任务)")
    print("=" * 60)
    print(f"\n服务持续运行中... (按 Ctrl+C 停止)")
    print(f"访问 Prefect UI: http://localhost:4200\n")
    
    # 启动服务，限制并发为3
    delete_targets_flow.serve(
        name="delete-targets",
        tags=["targets", "delete", "maintenance"],
        description="批量删除目标及其关联数据（软删除后的硬删除）",
        limit=3,  # 同时最多执行3个删除任务，平衡性能和资源占用
    )
