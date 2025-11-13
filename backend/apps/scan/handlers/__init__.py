"""Prefect Flow 状态处理器"""

from .initiate_scan_flow_handlers import (
    on_initiate_scan_flow_running,
    on_initiate_scan_flow_completed,
    on_initiate_scan_flow_failed,
    on_initiate_scan_flow_cancelled,
    on_initiate_scan_flow_crashed
)

from .scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)

__all__ = [
    # 初始化扫描流程处理器
    'on_initiate_scan_flow_running',
    'on_initiate_scan_flow_completed',
    'on_initiate_scan_flow_failed',
    'on_initiate_scan_flow_cancelled',
    'on_initiate_scan_flow_crashed',
    # 通用扫描流程处理器
    'on_scan_flow_running',
    'on_scan_flow_completed',
    'on_scan_flow_failed',
    'on_scan_flow_cancelled',
    'on_scan_flow_crashed'
]
