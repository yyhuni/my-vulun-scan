"""
Asset 删除任务模块

负责 Asset 数据的硬删除（Prefect Task）
"""

from .subdomain_delete_task import hard_delete_subdomain_task

__all__ = [
    'hard_delete_subdomain_task',
]
