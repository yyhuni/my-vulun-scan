"""
扫描模块工具包

提供扫描相关的工具函数（仅导出实际被外部使用的函数）

说明：
- 私有类（_CommandBuilder、_CommandExecutor 等）仅在内部使用，不对外暴露
- 私有单例（_command_builder、_executor 等）仅在内部使用，不对外暴露
- 只导出快捷函数（build_command、execute_stream 等），简化公共 API
"""

from .directory_cleanup import remove_directory
from .command_builder import build_command, build_scan_command
from .command_executor import execute_and_wait, execute_stream
from . import config_parser

__all__ = [
    # 目录清理
    'remove_directory',
    # 命令构建
    'build_command',         # 通用：字符串模板替换
    'build_scan_command',    # 专用：扫描工具命令构建
    # 命令执行
    'execute_and_wait',      # 等待式执行（文件输出）
    'execute_stream',        # 流式执行（实时处理）
    # 配置解析
    'config_parser',
]

