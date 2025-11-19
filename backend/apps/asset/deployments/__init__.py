"""
Asset 删除 Deployment 配置

负责注册 Asset 删除流程到 Prefect
"""

from .subdomain_deployment import create_subdomain_deployment
from .register import register_all_deployments
# 未来导入其他 deployments:
# from .website_deployment import create_website_deployment
# from .ip_address_deployment import create_ip_address_deployment
# from .endpoint_deployment import create_endpoint_deployment
# from .port_deployment import create_port_deployment
# from .directory_deployment import create_directory_deployment

__all__ = [
    'create_subdomain_deployment',
    'register_all_deployments',
    # 未来导出:
    # 'create_website_deployment',
    # 'create_ip_address_deployment',
    # 'create_endpoint_deployment',
    # 'create_port_deployment',
    # 'create_directory_deployment',
]
