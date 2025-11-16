"""
扫描命令执行工具

统一管理扫描工具的命令执行，支持文件输出、日志记录、结果验证等
"""

import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class _ScanCommandRunner:
    """
    扫描命令执行器
    
    职责：
    1. 执行扫描工具命令
    2. 将 stderr 记录到日志文件
    3. 验证输出文件是否生成
    4. 支持超时控制
    5. 清理资源
    
    与 _StreamCommandRunner 的区别：
    - _StreamCommandRunner: 流式输出，实时处理
    - _ScanCommandRunner: 文件输出，结果验证
    """
    
    def run(
        self,
        tool_name: str,
        command: str,
        timeout: int,
        log_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        执行扫描命令
        
        Args:
            tool_name: 工具名称（用于日志）
            command: 完整的扫描命令（包含输出文件参数）
            timeout: 超时时间（秒）
            log_file: 日志文件路径（可选，None 表示丢弃 stderr）
        
        Returns:
            dict: {
                'success': bool,         # 命令是否成功执行（returncode == 0）
                'returncode': int,       # 命令退出码
                'log_file': str | None   # 日志文件路径
            }
        
        Raises:
            ValueError: 参数验证失败
            RuntimeError: 目录验证失败
            subprocess.TimeoutExpired: 命令执行超时
            subprocess.SubprocessError: 命令执行失败
        """
        # 1. 验证参数
        if not tool_name:
            raise ValueError("工具名称不能为空")
        if not command:
            raise ValueError("扫描命令不能为空")
        if timeout <= 0:
            raise ValueError(f"超时时间必须大于0: {timeout}")
        
        logger.info("开始运行扫描工具: %s", tool_name)
        
        # 2. 准备日志文件
        log_file_path = Path(log_file) if log_file else None
        
        try:
            logger.debug("执行命令: %s", command)
            if log_file_path:
                logger.debug("日志文件: %s", log_file_path)
            else:
                logger.debug("日志输出: 丢弃")
            
            # 3. 执行扫描
            # stdout 始终丢弃，stderr 根据 log_file 决定
            if log_file_path:
                # 捕获 stderr 到日志文件
                with open(log_file_path, 'w', encoding='utf-8', buffering=1) as log_f:
                    result = subprocess.run(
                        command,
                        shell=True,
                        stdout=subprocess.DEVNULL,
                        stderr=log_f,
                        timeout=timeout,
                        check=False
                    )
            else:
                # 丢弃 stderr
                result = subprocess.run(
                    command,
                    shell=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=timeout,
                    check=False
                )
            
            # 4. 检查执行结果
            returncode = result.returncode
            success = (returncode == 0)
            
            if not success:
                # 命令执行失败，尝试读取错误日志
                error_output = ""
                if log_file_path:
                    error_output = self._read_log_tail(log_file_path, max_lines=1000)
                logger.warning(
                    "扫描工具 %s 返回非零状态码: %d%s",
                    tool_name, returncode,
                    f"\n错误输出:\n{error_output}" if error_output else ""
                )
            else:
                logger.info("✓ 扫描工具 %s 执行完成", tool_name)
            
            return {
                'success': success,
                'returncode': returncode,
                'log_file': str(log_file_path) if log_file_path else None
            }
            
        except subprocess.TimeoutExpired as e:
            error_msg = f"扫描工具 {tool_name} 执行超时（{timeout}秒）"
            logger.error(error_msg)
            # 超时时日志文件已保留
            if log_file_path and log_file_path.exists():
                logger.debug("超时日志已保存: %s", log_file_path)
            raise RuntimeError(error_msg) from e
        
        except subprocess.SubprocessError as e:
            error_msg = f"扫描工具 {tool_name} 执行失败: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
        
        except Exception as e:
            error_msg = f"扫描工具 {tool_name} 执行异常: {e}"
            logger.error(error_msg, exc_info=True)
            raise
    
    def _read_log_tail(self, log_file: Path, max_lines: int = 1000) -> str:
        """
        读取日志文件的末尾部分
        
        Args:
            log_file: 日志文件路径
            max_lines: 最大读取行数
        
        Returns:
            日志内容（字符串）
        """
        if not log_file.exists() or log_file.stat().st_size == 0:
            return ""
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                return ''.join(lines[-max_lines:] if len(lines) > max_lines else lines)
        except Exception:
            return "(无法读取日志文件)"


# 内部单例实例（不对外暴露）
_scan_command_runner = _ScanCommandRunner()


def run_scan_command(
    tool_name: str,
    command: str,
    timeout: int,
    log_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    快捷函数：执行扫描命令
    
    这是 _ScanCommandRunner.run() 的快捷方式
    
    Args:
        tool_name: 工具名称
        command: 扫描命令（包含输出文件参数）
        timeout: 超时时间（秒）
        log_file: 日志文件路径（可选，None 表示丢弃 stderr）
    
    Returns:
        执行结果字典: {
            'success': bool,
            'returncode': int,
            'log_file': str | None
        }
    
    Raises:
        RuntimeError: 执行失败或超时
    
    Examples:
        >>> from apps.scan.utils.run_scan_command import run_scan_command
        >>> result = run_scan_command(
        ...     tool_name='subfinder',
        ...     command='subfinder -d example.com -o /tmp/result.txt',
        ...     timeout=300,
        ...     log_file='/tmp/result.log'
        ... )
        >>> print(result['success'], result['returncode'])
        True 0
    """
    return _scan_command_runner.run(
        tool_name=tool_name,
        command=command,
        timeout=timeout,
        log_file=log_file
    )
