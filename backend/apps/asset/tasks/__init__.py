"""
Asset 删除任务模块

负责 Asset 数据的硬删除（Prefect Task）
"""

from .subdomain_delete_task import hard_delete_subdomain_task
from .website_delete_task import hard_delete_website_task
from .ip_address_delete_task import hard_delete_ip_address_task
from .port_delete_task import hard_delete_port_task
from .directory_delete_task import hard_delete_directory_task

__all__ = [
    'hard_delete_subdomain_task',
    'hard_delete_website_task',
    'hard_delete_ip_address_task',
    'hard_delete_port_task',
    'hard_delete_directory_task',
]
