"""
Repositories 模块

提供数据访问层接口
"""

from .scan_repository import ScanRepository
from .scan_task_repository import ScanTaskRepository

__all__ = [
    'ScanRepository',
    'ScanTaskRepository',
]

