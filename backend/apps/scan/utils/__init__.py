"""
扫描模块工具包

提供扫描相关的工具函数（仅导出实际被外部使用的函数）

说明：
- 私有类（_CommandBuilder、_StreamCommandRunner 等）仅在内部使用，不对外暴露
- 私有单例（_command_builder、_stream_command_runner 等）仅在内部使用，不对外暴露
- 只导出快捷函数（build_command、stream_command 等），简化公共 API
"""

from .directory_cleanup import remove_directory
from .command_builder import build_command, build_scan_command
from .stream_command import stream_command
from . import config_parser
from .run_scan_command import run_scan_command

__all__ = [
    # 目录清理
    'remove_directory',
    # 命令构建
    'build_command',         # 通用：字符串模板替换
    'build_scan_command',    # 专用：扫描工具命令构建
    # 流式命令执行
    'stream_command',
    # 配置解析
    'config_parser',
    # 扫描命令执行
    'run_scan_command',
]

