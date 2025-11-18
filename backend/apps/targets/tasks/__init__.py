"""
目标和组织删除任务模块

提供基于 Prefect 的异步删除 Tasks
"""

from .target_delete_task import hard_delete_target_task
from .organization_delete_task import hard_delete_organization_task

__all__ = [
    'hard_delete_target_task',
    'hard_delete_organization_task',
]
