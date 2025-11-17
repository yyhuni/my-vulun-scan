"""
目标模块异步任务

包含：
- 目标删除任务（target_tasks）
- 组织删除任务（organization_tasks）

架构分层：
Task → Service → Repository → Models
"""

from .target_tasks import async_bulk_delete_targets
from .organization_tasks import async_bulk_delete_organizations

__all__ = [
    'async_bulk_delete_targets',
    'async_bulk_delete_organizations',
]
