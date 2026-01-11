"""Scan Models - 统一导出"""

from .scan_models import Scan, SoftDeleteManager
from .scan_log_model import ScanLog
from .scheduled_scan_model import ScheduledScan
from .subfinder_provider_settings_model import SubfinderProviderSettings
from .scan_input_target import ScanInputTarget

# 兼容旧名称（已废弃，请使用 SubfinderProviderSettings）
ProviderSettings = SubfinderProviderSettings

__all__ = [
    'Scan',
    'ScanLog',
    'ScheduledScan',
    'SoftDeleteManager',
    'SubfinderProviderSettings',
    'ProviderSettings',  # 兼容旧名称
    'ScanInputTarget',
]
