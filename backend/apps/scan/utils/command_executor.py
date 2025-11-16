"""
命令执行器

统一管理所有命令执行方式：
- execute_and_wait(): 等待式执行，适合输出到文件的工具
- execute_stream(): 流式执行，适合实时处理输出的工具
"""

import logging
import re
import subprocess
import threading
from pathlib import Path
from typing import Dict, Any, Optional, Generator

logger = logging.getLogger(__name__)

# 常量定义
GRACEFUL_SHUTDOWN_TIMEOUT = 5  # 进程优雅退出的超时时间（秒）
MAX_LOG_TAIL_LINES = 1000  # 日志文件读取的最大行数


class CommandExecutor:
    """
    统一的命令执行器
    
    提供两种执行模式：
    1. execute_and_wait() - 等待式执行（适合文件输出）
    2. execute_stream() - 流式执行（适合实时处理）
    """
    
    def execute_and_wait(
        self,
        tool_name: str,
        command: str,
        timeout: int,
        log_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        等待式执行：启动命令并等待完成
        
        适用场景：工具输出到文件（如 subfinder -o output.txt）
        
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
            RuntimeError: 执行失败或超时
        """
        # 验证参数
        if not tool_name:
            raise ValueError("工具名称不能为空")
        if not command:
            raise ValueError("扫描命令不能为空")
        if timeout <= 0:
            raise ValueError(f"超时时间必须大于0: {timeout}")
        
        logger.info("开始运行扫描工具: %s", tool_name)
        
        # 准备日志文件
        log_file_path = Path(log_file) if log_file else None
        
        try:
            logger.debug("执行命令: %s", command)
            if log_file_path:
                logger.debug("日志文件: %s", log_file_path)
            else:
                logger.debug("日志输出: 丢弃")
            
            # 执行扫描
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
            
            # 检查执行结果
            returncode = result.returncode
            success = (returncode == 0)
            
            if not success:
                # 命令执行失败，尝试读取错误日志
                error_output = ""
                if log_file_path:
                    error_output = self._read_log_tail(log_file_path, max_lines=MAX_LOG_TAIL_LINES)
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
    
    def execute_stream(
        self,
        cmd: str,
        cwd: Optional[str] = None,
        shell: bool = False,
        encoding: str = 'utf-8',
        suffix_char: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> Generator[str, None, None]:
        """
        流式执行：逐行返回输出
        
        适用场景：工具流式输出 JSON（如 naabu -json）
        
        Args:
            cmd: 要执行的命令
            cwd: 工作目录
            shell: 是否使用 shell 执行
            encoding: 编码格式
            suffix_char: 末尾后缀字符（用于移除）
            timeout: 命令执行超时时间（秒），None 表示不设置超时
        
        Yields:
            str: 每行输出的内容（已处理：去空白、去ANSI、去后缀）
            
        Raises:
            subprocess.TimeoutExpired: 命令执行超时
        """
        logger.info(f"执行命令: {cmd}")

        # 根据是否使用shell来格式化命令
        command = cmd if shell else cmd.split()

        # 启动子进程，以流式方式捕获输出
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # 将错误输出合并到标准输出
            cwd=cwd,
            universal_newlines=True,  # 文本模式，自动处理换行符
            encoding=encoding,
            shell=shell
        )
            
        # 超时控制：使用 Timer 在指定时间后终止进程
        timed_out_event = threading.Event()
            
        def _kill_when_timeout():
            timed_out_event.set()
            if process.poll() is None:  # 进程还在运行
                logger.warning(f"命令执行超时（{timeout}秒），正在终止进程: {cmd}")
                process.kill()
            
        timer = None
        if timeout is not None:
            timer = threading.Timer(timeout, _kill_when_timeout)
            timer.start()

        try:
            # 逐行读取进程输出
            stdout = process.stdout
            assert stdout is not None, "stdout should not be None when stdout=PIPE"
            
            for line in iter(lambda: stdout.readline(), ''):
                if not line:
                    break
                
                # 去除行首尾的空白字符
                line = line.strip()
                # 跳过空行
                if not line:
                    continue
                
                # 移除ANSI转义序列（颜色、格式等控制字符）
                ansi_escape = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')
                line = ansi_escape.sub('', line)
                # 处理Windows风格的换行符
                line = line.replace('\\x0d\\x0a', '\n')
                
                # 如果指定了后缀字符，移除末尾的后缀字符
                if suffix_char and line.endswith(suffix_char):
                    line = line[:-1]
                
                # 直接返回行内容，由调用者负责解析
                yield line
        
        finally:
            # 1. 停止定时器（如果还没触发）
            if timer:
                timer.cancel()
                timer.join(timeout=0.1)  # 等待 timer 线程完全结束，避免悬挂
            
            # 2. 清理进程资源
            # 注意：使用 timed_out_event 避免竞态条件
            exit_code = None
            
            if timed_out_event.is_set():
                # 超时情况：定时器已经处理了进程终止，只需获取退出码
                logger.debug("进程已被超时定时器终止，等待进程结束")
                try:
                    exit_code = process.wait(timeout=1.0)  # 等待进程完全退出
                except subprocess.TimeoutExpired:
                    # 极端情况：进程仍未退出，强制终止
                    logger.warning("进程在超时后仍未退出，强制终止")
                    process.kill()
                    exit_code = process.wait()
            elif process.poll() is None:
                # 正常情况：进程还在运行，需要手动清理
                logger.debug("进程仍在运行，执行优雅终止")
                process.terminate()
                try:
                    exit_code = process.wait(timeout=GRACEFUL_SHUTDOWN_TIMEOUT)
                except subprocess.TimeoutExpired:
                    # 优雅终止失败，强制杀死
                    logger.warning("进程未响应 terminate 信号，强制 kill")
                    process.kill()
                    exit_code = process.wait()
            else:
                # 进程已经正常结束
                exit_code = process.returncode
                logger.debug("进程已正常结束，退出码: %s", exit_code)
            
            # 3. 如果是超时导致的终止，抛出标准异常
            # 注意：对于流式处理任务（如端口扫描），超时时已处理的数据已保存到数据库
            # 这是预期行为：流式处理允许部分数据保存，即使任务未完全完成
            if timed_out_event.is_set():
                raise subprocess.TimeoutExpired(cmd, timeout if timeout else 0)
            
            # 4. 记录异常退出的情况（非超时）
            if exit_code is not None and exit_code != 0:
                logger.warning("命令执行失败，退出码: %s", exit_code)
    
    def _read_log_tail(self, log_file: Path, max_lines: int = MAX_LOG_TAIL_LINES) -> str:
        """
        读取日志文件的末尾部分
        
        Args:
            log_file: 日志文件路径
            max_lines: 最大读取行数
        
        Returns:
            日志内容（字符串），读取失败返回错误提示
        """
        if not log_file.exists():
            logger.debug("日志文件不存在: %s", log_file)
            return ""
        
        if log_file.stat().st_size == 0:
            logger.debug("日志文件为空: %s", log_file)
            return ""
        
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                return ''.join(lines[-max_lines:] if len(lines) > max_lines else lines)
        except UnicodeDecodeError as e:
            logger.warning("日志文件编码错误 (%s): %s", log_file, e)
            return f"(无法读取日志文件: 编码错误 - {e})"
        except PermissionError as e:
            logger.warning("日志文件权限不足 (%s): %s", log_file, e)
            return f"(无法读取日志文件: 权限不足)"
        except IOError as e:
            logger.warning("日志文件读取IO错误 (%s): %s", log_file, e)
            return f"(无法读取日志文件: IO错误 - {e})"
        except Exception as e:
            logger.warning("读取日志文件失败 (%s): %s", log_file, e, exc_info=True)
            return f"(无法读取日志文件: {type(e).__name__} - {e})"


# 单例实例
_executor = CommandExecutor()


# 快捷函数
def execute_and_wait(
    tool_name: str,
    command: str,
    timeout: int,
    log_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    等待式执行命令（快捷函数）
    
    适用场景：工具输出到文件（如 subfinder -o output.txt）
    
    Args:
        tool_name: 工具名称
        command: 扫描命令（包含输出文件参数）
        timeout: 超时时间（秒）
        log_file: 日志文件路径（可选）
    
    Returns:
        执行结果字典
    
    Raises:
        RuntimeError: 执行失败或超时
    """
    return _executor.execute_and_wait(tool_name, command, timeout, log_file)


def execute_stream(
    cmd: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    encoding: str = 'utf-8',
    suffix_char: Optional[str] = None,
    timeout: Optional[int] = None
) -> Generator[str, None, None]:
    """
    流式执行命令（快捷函数）
    
    适用场景：工具流式输出 JSON（如 naabu -json）
    
    Args:
        cmd: 要执行的命令
        cwd: 工作目录
        shell: 是否使用 shell 执行
        encoding: 编码格式
        suffix_char: 末尾后缀字符
        timeout: 命令执行超时时间（秒）
    
    Yields:
        str: 每行输出的内容
        
    Raises:
        subprocess.TimeoutExpired: 命令执行超时
    """
    return _executor.execute_stream(cmd, cwd, shell, encoding, suffix_char, timeout)
