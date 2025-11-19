"""
目标和组织删除任务的 Prefect Deployment 配置
"""

from .target_deployment import create_target_deployment
from .organization_deployment import create_organization_deployment
from .register import register_all_deployments

__all__ = [
    'create_target_deployment',
    'create_organization_deployment',
    'register_all_deployments',
]
