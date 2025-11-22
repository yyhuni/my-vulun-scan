"""
Asset 删除任务模块

负责 Asset 数据的硬删除（Prefect Task）
"""

"""Asset Tasks - 异步任务层"""

# 资产模块 Tasks
from .asset import (
    hard_delete_subdomain_task,
    hard_delete_website_task,
    hard_delete_ip_address_task,
    hard_delete_port_task,
    hard_delete_directory_task,
)

__all__ = [
    'hard_delete_subdomain_task',
    'hard_delete_website_task',
    'hard_delete_ip_address_task',
    'hard_delete_port_task',
    'hard_delete_directory_task',
]
