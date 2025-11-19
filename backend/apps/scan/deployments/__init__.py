"""
Prefect Deployments 配置包

包含所有 Scan 相关的 Prefect Flow 部署配置：
- initiate_scan_deployment: 扫描初始化任务
- cleanup_deployment: 定时清理任务
- register: 统一注册所有 Scan Deployments
"""

from .register import register_all_deployments

__all__ = ['register_all_deployments']

