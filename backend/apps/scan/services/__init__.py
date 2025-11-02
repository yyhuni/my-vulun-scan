"""
任务服务模块

提供各种扫描任务的服务功能
"""

from .subdomain_discovery import subdomain_discovery, get_scan_results, count_subdomains
from .command_executor import CommandExecutor, ScanCommandExecutor, execute_command

__all__ = [
    'subdomain_discovery',
    'get_scan_results',
    'count_subdomains',
    'CommandExecutor',
    'ScanCommandExecutor',
    'execute_command'
]
