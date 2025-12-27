"""
扫描模块工具包

提供扫描相关的工具函数。
"""

from .directory_cleanup import remove_directory
from .command_builder import build_scan_command
from .command_executor import execute_and_wait, execute_stream
from .wordlist_helpers import ensure_wordlist_local
from .nuclei_helpers import ensure_nuclei_templates_local
from .performance import FlowPerformanceTracker, CommandPerformanceTracker
from .workspace_utils import setup_scan_workspace, setup_scan_directory
from . import config_parser

__all__ = [
    # 目录清理
    'remove_directory',
    # 工作空间
    'setup_scan_workspace',  # 创建 Scan 根工作空间
    'setup_scan_directory',  # 创建扫描子目录
    # 命令构建
    'build_scan_command',    # 扫描工具命令构建（基于 f-string）
    # 命令执行
    'execute_and_wait',      # 等待式执行（文件输出）
    'execute_stream',        # 流式执行（实时处理）
    # 字典文件
    'ensure_wordlist_local', # 确保本地字典文件（含 hash 校验）
    # Nuclei 模板
    'ensure_nuclei_templates_local',  # 确保本地模板（含 commit hash 校验）
    # 性能监控
    'FlowPerformanceTracker',      # Flow 性能追踪器（含系统资源采样）
    'CommandPerformanceTracker',   # 命令性能追踪器
    # 配置解析
    'config_parser',
]

