"""
Asset Deployments - 部署配置

负责注册 Asset 删除流程到 Prefect
"""

# 资产模块 Deployments
from .asset import (
    create_subdomain_deployment,
    create_website_deployment,
    create_ip_address_deployment,
    create_port_deployment,
    create_directory_deployment,
)

__all__ = [
    'create_subdomain_deployment',
    'create_website_deployment',
    'create_ip_address_deployment',
    'create_port_deployment',
    'create_directory_deployment',
]
