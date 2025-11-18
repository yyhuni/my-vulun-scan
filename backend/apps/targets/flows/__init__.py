"""
目标和组织删除 Flows

提供基于 Prefect 的删除流程编排
"""

from .delete_targets_flow import delete_targets_flow
from .delete_organizations_flow import delete_organizations_flow

__all__ = [
    'delete_targets_flow',
    'delete_organizations_flow',
]
