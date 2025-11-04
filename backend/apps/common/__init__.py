"""
通用工具模块

提供各种共享的工具类和函数
"""

from .command_executor import CommandExecutor, ScanCommandExecutor, execute_command
from .normalizer import normalize_domain, normalize_ip, normalize_cidr, normalize_target
from .validators import validate_domain, validate_ip, validate_cidr, detect_target_type

__all__ = [
    # 命令执行器
    'CommandExecutor',
    'ScanCommandExecutor',
    'execute_command',
    
    # 规范化工具
    'normalize_domain',
    'normalize_ip',
    'normalize_cidr',
    'normalize_target',
    
    # 验证器
    'validate_domain',
    'validate_ip',
    'validate_cidr',
    'detect_target_type',
]

