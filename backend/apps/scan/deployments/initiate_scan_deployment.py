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
    
    使用本地开发模式，修改代码立即生效
    """
    
    print("=" * 60)
    print(f"  Flow: initiate_scan")
    print(f"  部署名称: initiate-scan-on-demand")
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
