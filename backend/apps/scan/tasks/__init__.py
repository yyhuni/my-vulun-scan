"""
扫描任务模块

包含：
- Prefect Tasks: 具体操作的执行单元
- Legacy Tasks: 保留的旧任务（待迁移）

架构说明：
- 新架构：Flow（flows/）编排 Tasks（tasks/）
- Tasks 负责具体操作，Flow 负责编排
"""

# Prefect Tasks（新架构）
from .workspace_tasks import create_workspace_task
from .config_tasks import parse_engine_config_task

# Legacy Tasks（旧架构 - 待迁移）
from .subdomain_discovery_task import subdomain_discovery_task
from .finalize_scan_task import finalize_scan_task
from .cleanup_old_scans_task import cleanup_old_scans_task

# 注意：
# - initiate_scan_task 已迁移到 flows/initiate_scan_flow.py
# - workflow_tasks.py 已废弃（编排逻辑应在 Flow 中，不应封装为 Task）

__all__ = [
    # Prefect Tasks
    'create_workspace_task',
    'parse_engine_config_task',
    # Legacy Tasks
    'subdomain_discovery_task',
    'finalize_scan_task',
    'cleanup_old_scans_task',
]
