"""
扫描命令执行器模块

提供安全的扫描工具命令执行功能
"""

import logging
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)


class ScanCommandExecutor:
    """
    扫描工具命令执行器
    
    提供安全的子进程命令执行功能，专门用于执行扫描工具（如 amass、subfinder 等）
    """
    
    def __init__(self, timeout: int = 300):
        """
        初始化命令执行器
        
        Args:
            timeout: 命令执行超时时间（秒），默认 300 秒（5 分钟）
        """
        self.timeout = timeout
    
    def execute(self, command: str, capture_output: bool = False) -> Optional[str]:
        """
        执行命令
        
        Args:
            command: 要执行的命令字符串
            capture_output: 是否捕获标准输出（默认 False）
        
        Returns:
            如果 capture_output=True，返回命令输出；否则返回 None
        
        Raises:
            subprocess.CalledProcessError: 命令执行失败
            subprocess.TimeoutExpired: 命令执行超时
        """
        logger.debug("Executing command: %s", command)
        
        stdout_dest = subprocess.PIPE if capture_output else subprocess.DEVNULL
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                check=True,
                stdout=stdout_dest,
                stderr=subprocess.PIPE,
                encoding='utf-8',
                timeout=self.timeout
            )
            
            logger.debug("Command executed successfully")
            return result.stdout if capture_output else None
        
        except subprocess.CalledProcessError as e:
            logger.error("Command failed with return code %d: %s", e.returncode, command)
            if e.stderr:
                logger.error("Error output: %s", e.stderr.strip())
            raise
        
        except subprocess.TimeoutExpired as exc:
            logger.error("Command timeout after %ds: %s", self.timeout, command)
            raise subprocess.CalledProcessError(
                124, command, f"Command timeout after {self.timeout}s"
            ) from exc
    
    


# 创建默认实例（）
default_executor = ScanCommandExecutor()


def execute_command(command: str, capture_output: bool = False, timeout: int = 300) -> Optional[str]:
    """
    便捷函数：执行单个命令
    
    Args:
        command: 要执行的命令字符串
        capture_output: 是否捕获输出
        timeout: 超时时间（秒），默认 300 秒
    
    Returns:
        命令输出（如果 capture_output=True）
    
    Raises:
        subprocess.CalledProcessError: 命令执行失败
    
    Example:
        >>> execute_command('echo "Hello"', capture_output=True)
        'Hello\\n'
    """
    executor = ScanCommandExecutor(timeout=timeout)
    return executor.execute(command, capture_output=capture_output)


__all__ = ['ScanCommandExecutor', 'execute_command', 'default_executor']

