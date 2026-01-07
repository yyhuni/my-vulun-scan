"""
扫描服务模块

提供各种扫描任务的服务功能

架构：
- ScanService: 主服务（协调者）
- ScanCreationService: 创建服务
- ScanStateService: 状态管理服务
- ScanControlService: 控制服务
- ScanStatsService: 统计服务
"""

from .scan_service import ScanService
from .scan_creation_service import ScanCreationService
from .scan_state_service import ScanStateService
from .scan_control_service import ScanControlService
from .scan_stats_service import ScanStatsService
from .scheduled_scan_service import ScheduledScanService
from .target_export_service import (
    TargetExportService,
    create_export_service,
    export_urls_with_fallback,
    DataSource,
)

__all__ = [
    'ScanService',           # 主入口（向后兼容）
    'ScanCreationService',
    'ScanStateService',
    'ScanControlService',
    'ScanStatsService',
    'ScheduledScanService',
    'TargetExportService',   # 目标导出服务
    'create_export_service',
    'export_urls_with_fallback',
    'DataSource',
]

