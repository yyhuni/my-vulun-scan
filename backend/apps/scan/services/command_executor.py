"""
命令执行器模块

提供安全的子进程命令执行功能
"""

import logging
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)


class CommandExecutor:
    """命令执行器类"""
    
    def __init__(self, timeout: int = 300):
        """
        初始化命令执行器
        
        Args:
            timeout: 命令执行超时时间（秒），默认300秒
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


class ScanCommandExecutor(CommandExecutor):
    """扫描工具专用的命令执行器"""
    
    def execute_scan_tool(self, tool_name: str, command: str) -> bool:
        """
        执行扫描工具命令
        
        Args:
            tool_name: 工具名称（用于日志）
            command: 要执行的命令
        
        Returns:
            执行成功返回 True，失败抛出异常
        
        Raises:
            subprocess.CalledProcessError: 命令执行失败
        """
        logger.info("Executing scan tool: %s", tool_name)
        
        try:
            self.execute(command, capture_output=False)
            logger.info("Scan tool '%s' completed successfully", tool_name)
            return True
        
        except subprocess.CalledProcessError as e:
            logger.warning("Scan tool '%s' failed: %s", tool_name, str(e))
            raise


# 创建默认实例
default_executor = ScanCommandExecutor()


def execute_command(command: str, capture_output: bool = False, timeout: int = 300) -> Optional[str]:
    """
    便捷函数：执行单个命令
    
    Args:
        command: 要执行的命令字符串
        capture_output: 是否捕获输出
        timeout: 超时时间（秒）
    
    Returns:
        命令输出（如果 capture_output=True）
    
    Raises:
        subprocess.CalledProcessError: 命令执行失败
    """
    executor = CommandExecutor(timeout=timeout)
    return executor.execute(command, capture_output=capture_output)


__all__ = ['CommandExecutor', 'ScanCommandExecutor', 'execute_command', 'default_executor']

