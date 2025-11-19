"""
Asset 删除 Deployment 配置

负责注册 Asset 删除流程到 Prefect
"""

from .subdomain_deployment import create_subdomain_deployment
from .website_deployment import create_website_deployment
from .ip_address_deployment import create_ip_address_deployment
from .port_deployment import create_port_deployment
from .directory_deployment import create_directory_deployment
from .register import register_all_deployments

__all__ = [
    'create_subdomain_deployment',
    'create_website_deployment',
    'create_ip_address_deployment',
    'create_port_deployment',
    'create_directory_deployment',
    'register_all_deployments',
]
