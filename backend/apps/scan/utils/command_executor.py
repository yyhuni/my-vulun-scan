"""
扫描命令执行器模块

提供安全的扫描工具命令执行功能
"""

import logging
import subprocess
from typing import Optional

from django.conf import settings

logger = logging.getLogger(__name__)

# 命令输出专用日志记录器（如果启用）
command_output_logger = None
if settings.COMMAND_LOG_OUTPUT:
    command_output_logger = logging.getLogger('command_output')


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
        
        # 如果启用了命令输出日志，记录命令开始执行
        if command_output_logger:
            command_output_logger.info("=" * 80)
            command_output_logger.info("命令: %s", command)
            command_output_logger.info("超时: %d 秒", self.timeout)
            command_output_logger.info("-" * 80)
        
        # 如果启用命令输出日志，始终捕获 stdout 和 stderr
        should_capture = capture_output or bool(command_output_logger)
        stdout_dest = subprocess.PIPE if should_capture else subprocess.DEVNULL
        
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
            
            # 记录命令输出到专用日志（模拟终端显示）
            if command_output_logger:
                # 记录标准输出
                if result.stdout:
                    command_output_logger.info("[STDOUT]")
                    command_output_logger.info(result.stdout.rstrip())
                
                # 记录标准错误（即使成功也可能有 stderr 输出）
                if result.stderr:
                    command_output_logger.info("[STDERR]")
                    command_output_logger.info(result.stderr.rstrip())
                
                # 记录执行状态
                command_output_logger.info("状态: 成功 | 退出码: 0")
                command_output_logger.info("=" * 80)
                command_output_logger.info("")  # 空行分隔
            
            return result.stdout if capture_output else None
        
        except subprocess.CalledProcessError as e:
            logger.error("Command failed with return code %d: %s", e.returncode, command)
            if e.stderr:
                logger.error("Error output: %s", e.stderr.strip())
            
            # 记录错误到命令输出日志
            if command_output_logger:
                # 记录标准输出（如果有）
                if e.stdout:
                    command_output_logger.error("[STDOUT]")
                    command_output_logger.error(e.stdout.rstrip())
                
                # 记录标准错误
                if e.stderr:
                    command_output_logger.error("[STDERR]")
                    command_output_logger.error(e.stderr.rstrip())
                
                # 记录执行状态
                command_output_logger.error("状态: 失败 | 退出码: %d", e.returncode)
                command_output_logger.error("=" * 80)
                command_output_logger.info("")  # 空行分隔
            
            raise
        
        except subprocess.TimeoutExpired as exc:
            logger.error("Command timeout after %ds: %s", self.timeout, command)
            
            # 记录超时到命令输出日志
            if command_output_logger:
                # 记录超时前的标准输出
                if exc.stdout:
                    command_output_logger.error("[STDOUT] (超时前)")
                    command_output_logger.error(exc.stdout.rstrip())
                
                # 记录超时前的标准错误
                if exc.stderr:
                    command_output_logger.error("[STDERR] (超时前)")
                    command_output_logger.error(exc.stderr.rstrip())
                
                # 记录执行状态
                command_output_logger.error("状态: 超时 | 超时时间: %d 秒", self.timeout)
                command_output_logger.error("=" * 80)
                command_output_logger.info("")  # 空行分隔
            
            raise subprocess.CalledProcessError(
                124, command, f"Command timeout after {self.timeout}s"
            ) from exc



__all__ = ['ScanCommandExecutor']

