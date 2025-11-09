"""
扫描初始化任务的 Deployment 配置

用于异步提交扫描任务（非定时调度）

Prefect 3.x 版本
"""

# 导入 Flow
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# 配置 Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.scan.flows.initiate_scan_flow import initiate_scan_flow


if __name__ == "__main__":
    """
    启动扫描初始化任务的服务 (Prefect 3.x)
    
    使用方法：
        python deployments/initiate_scan_deployment.py
    
    配置说明：
    - 本地开发模式（使用 serve）
    - 不使用定时调度（按需触发）
    - 通过 Prefect API 手动触发
    
    注意：
    - serve() 会启动一个持续运行的进程
    - 需要保持脚本运行以处理任务
    - 生产环境应使用 deploy() + Docker
    """
    
    # Prefect 3.x 本地开发推荐：使用 flow.serve()
    print("正在启动 initiate_scan Flow 服务...")
    print("=" * 60)
    print("  Flow: initiate_scan")
    print("  模式: 本地开发服务（持续运行）")
    print("  调度: 按需触发（无定时调度）")
    print("  触发方式: 通过 Prefect API/UI 手动触发")
    print("=" * 60)
    print("\n按 Ctrl+C 停止服务\n")
    
    initiate_scan_flow.serve(
        name="initiate-scan-on-demand",
        tags=["scan", "on-demand", "async"],
        description="按需触发的扫描初始化任务（通过 API 调用）",
    )
