"""
命令执行器

统一管理所有命令执行方式：
- execute_and_wait(): 等待式执行，适合输出到文件的工具
- execute_stream(): 流式执行，适合实时处理输出的工具
"""

import logging
import os
from django.conf import settings
import re
import signal
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, Generator

try:
    # 可选依赖：用于根据 CPU / 内存负载做动态并发控制
    import psutil
except ImportError:  # 运行环境缺少 psutil 时降级为无动态负载控制
    psutil = None

logger = logging.getLogger(__name__)

# 常量定义
GRACEFUL_SHUTDOWN_TIMEOUT = 5  # 进程优雅退出的超时时间（秒）
MAX_LOG_TAIL_LINES = 1000  # 日志文件读取的最大行数

# 命令日志配置（从环境变量读取）
# ENABLE_COMMAND_LOGGING=true: 输出所有内容（命令输出+错误）到log_file_path
# ENABLE_COMMAND_LOGGING=false: 只输出错误到log_file_path
ENABLE_COMMAND_LOGGING = getattr(settings, 'ENABLE_COMMAND_LOGGING', False)

# 动态并发控制阈值（可在 Django settings 中覆盖）
SCAN_CPU_HIGH = getattr(settings, 'SCAN_CPU_HIGH', 85.0)   # CPU 高水位（百分比）
SCAN_MEM_HIGH = getattr(settings, 'SCAN_MEM_HIGH', 85.0)   # 内存高水位（百分比）
SCAN_LOAD_CHECK_INTERVAL = getattr(settings, 'SCAN_LOAD_CHECK_INTERVAL', 5)  # 负载检查间隔（秒）

_ACTIVE_COMMANDS = 0
_ACTIVE_COMMANDS_LOCK = threading.Lock()


def _wait_for_system_load() -> None:
    """根据当前机器 CPU/内存负载，决定是否暂缓启动新的外部命令。

    - 当 psutil 可用时，循环读取当前 CPU / 内存使用率；
    - 只要任一指标超过阈值，就暂缓启动新的扫描子进程；
    - 等待一小段时间后重试，直到负载恢复到安全范围。
    """

    if psutil is None:
        # 没有 psutil 时不做负载感知控制
        return

    while True:
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory().percent

        if cpu < SCAN_CPU_HIGH and mem < SCAN_MEM_HIGH:
            # 负载在安全范围内，允许继续申请并发槽位
            return

        logger.warning(
            "系统负载较高，暂缓启动新的扫描进程: cpu=%.1f%% (阈值 %.1f%%), mem=%.1f%% (阈值 %.1f%%)",
            cpu,
            SCAN_CPU_HIGH,
            mem,
            SCAN_MEM_HIGH,
        )
        time.sleep(SCAN_LOAD_CHECK_INTERVAL)


class CommandExecutor:
    """
    统一的命令执行器
    
    提供两种执行模式：
    1. execute_and_wait() - 等待式执行（适合文件输出）
    2. execute_stream() - 流式执行（适合实时处理）
    """
    
    def _write_command_info_header(self, log_file: Path, tool_name: str, command: str, duration: float, returncode: int, success: bool, timeout: Optional[int] = None):
        """
        在日志文件开头写入命令信息
        
        Args:
            log_file: 日志文件路径
            tool_name: 工具名称
            command: 执行的命令
            duration: 执行时间
            returncode: 退出码
            success: 是否成功
            timeout: 超时时间（秒）
        """
        if not ENABLE_COMMAND_LOGGING:
            return
        
        try:
            # 读取原有内容
            original_content = ""
            if log_file.exists():
                with open(log_file, 'r', encoding='utf-8') as f:
                    original_content = f.read()
            
            # 在开头写入命令信息
            with open(log_file, 'w', encoding='utf-8') as f:
                # 命令信息头部
                f.write(f"{command}\n")
                f.write(f"\n{'='*60}\n")
                f.write(f"# 命令执行信息\n")
                f.write(f"# 时间: {datetime.now().isoformat()}\n")
                f.write(f"# 工具: {tool_name}\n")
                if timeout is not None:
                    f.write(f"# 超时时间: {timeout}秒\n")
                f.write(f"# 执行时间: {duration:.2f}秒\n")
                f.write(f"# 退出码: {returncode}\n")
                f.write(f"# 成功: {'Yes' if success else 'No'}\n")
                f.write(f"\n{'='*60}\n")
                f.write(f"工具输出：\n")
                f.write(f"{'='*60}\n\n")
                
                # 原有内容
                if original_content.strip():
                    f.write(original_content)
                else:
                    f.write("（无输出）\n")
            
            logger.info(f"📝 {tool_name} 日志: {log_file} (执行时间: {duration:.2f}秒)")
            
        except Exception as e:
            logger.warning(f"无法写入命令信息头: {e}")

    def _kill_process_tree(self, process: subprocess.Popen) -> None:
        """
        强制终止进程树
        
        当使用 shell=True 时，process.pid 是 shell 的 PID。
        如果不杀掉整个进程组，shell 的子进程（实际工具）会变成孤儿进程继续运行。
        """
        if process.poll() is not None:
            return

        try:
            # 尝试杀掉进程组（需要进程启动时设置 start_new_session=True）
            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
            logger.debug(f"已终止进程组: PGID={process.pid}")
        except ProcessLookupError:
            pass  # 进程已不存在
        except Exception as e:
            logger.warning(f"终止进程组失败 ({e})，尝试普通 kill")
            try:
                process.kill()
            except:
                pass

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
        global _ACTIVE_COMMANDS

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
        
        # 记录开始时间（用于计算执行时间）
        start_time = datetime.now()
        
        process = None
        log_file_handle = None
        acquired_slot = False  # 标记是否已增加全局活动命令计数
        
        try:
            # 在启动新的外部命令之前，先根据 CPU/内存负载判断是否需要等待
            _wait_for_system_load()

            acquired_slot = True
            if _ACTIVE_COMMANDS_LOCK:
                with _ACTIVE_COMMANDS_LOCK:
                    _ACTIVE_COMMANDS += 1
                    current_active = _ACTIVE_COMMANDS
            else:
                current_active = 0
            logger.info(
                "登记活动命令计数: tool=%s, active=%d",
                tool_name,
                current_active,
            )
            
            logger.debug("执行命令: %s", command)
            if log_file_path:
                logger.debug("日志文件: %s", log_file_path)
            else:
                logger.debug("日志输出: 丢弃")
            
            # 准备输出流
            stdout_target = subprocess.DEVNULL
            stderr_target = subprocess.DEVNULL
            
            if log_file_path:
                log_file_handle = open(log_file_path, 'w', encoding='utf-8', buffering=1)
                if ENABLE_COMMAND_LOGGING:
                    stdout_target = log_file_handle
                    stderr_target = subprocess.STDOUT
                else:
                    stderr_target = log_file_handle

            # 启动进程
            # 使用 start_new_session=True 创建新会话，使子进程成为新进程组的首领
            # 这样我们可以通过 killpg 杀掉整个进程树
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                shell=True,
                stdout=stdout_target,
                stderr=stderr_target,
                text=True,
                start_new_session=True
            )
            
            # 等待完成
            process.communicate(timeout=timeout)
            
            # 检查执行结果
            returncode = process.returncode
            success = (returncode == 0)
            
            # 计算执行时间
            duration = (datetime.now() - start_time).total_seconds()
            
            # 在日志文件开头添加命令信息（如果开启且有日志文件）
            if log_file_path and ENABLE_COMMAND_LOGGING:
                self._write_command_info_header(log_file_path, tool_name, command, duration, returncode, success, timeout)
            command_log_file = str(log_file_path) if log_file_path else None
            
            if not success:
                # 命令执行失败，尝试读取错误日志
                error_output = ""
                if log_file_path:
                    error_output = self._read_log_tail(log_file_path, max_lines=MAX_LOG_TAIL_LINES)
                logger.warning(
                    "扫描工具 %s 返回非零状态码: %d (执行时间: %.2f秒)%s",
                    tool_name, returncode, duration,
                    f"\n错误输出:\n{error_output}" if error_output else ""
                )
            else:
                logger.info("✓ 扫描工具 %s 执行完成 (执行时间: %.2f秒)", tool_name, duration)
            
            return {
                'success': success,
                'returncode': returncode,
                'log_file': str(log_file_path) if log_file_path else None,
                'command_log_file': command_log_file,
                'duration': duration
            }
            
        except subprocess.TimeoutExpired as e:
            # 计算超时时的执行时间
            duration = (datetime.now() - start_time).total_seconds()
            
            # 在日志文件开头添加超时信息
            if log_file_path and ENABLE_COMMAND_LOGGING:
                self._write_command_info_header(log_file_path, tool_name, command, duration, -1, False, timeout)
            
            error_msg = f"扫描工具 {tool_name} 执行超时（{timeout}秒，实际执行: {duration:.2f}秒）"
            logger.error(error_msg)
            if log_file_path and log_file_path.exists():
                logger.debug("超时日志已保存: %s", log_file_path)
            raise RuntimeError(error_msg) from e
        
        except subprocess.SubprocessError as e:
            error_msg = f"扫描工具 {tool_name} 执行失败: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
            
        except Exception as e:
            # 捕获所有异常（包括 Prefect 取消引发的 CancelledError 等）
            # 确保在 finally 块中清理进程
            error_msg = f"扫描工具 {tool_name} 执行异常（可能是被中断）: {e}"
            logger.error(error_msg, exc_info=True)
            raise
            
        finally:
            # 关键修复：确保进程树被清理
            if process:
                self._kill_process_tree(process)
                
            # 关闭文件句柄
            if log_file_handle:
                try:
                    log_file_handle.close()
                except:
                    pass
            
            if acquired_slot:
                if _ACTIVE_COMMANDS_LOCK:
                    with _ACTIVE_COMMANDS_LOCK:
                        if _ACTIVE_COMMANDS > 0:
                            _ACTIVE_COMMANDS -= 1
                        current_active = _ACTIVE_COMMANDS
                else:
                    current_active = 0
                logger.info(
                    "释放活动命令计数: tool=%s, active=%d",
                    tool_name,
                    current_active,
                )
    
    def execute_stream(
        self,
        cmd: str,
        tool_name: str,
        cwd: Optional[str] = None,
        shell: bool = False,
        encoding: str = 'utf-8',
        suffix_char: Optional[str] = None,
        timeout: Optional[int] = None,
        log_file: Optional[str] = None
    ) -> Generator[str, None, None]:
        """
        流式执行：逐行返回输出
        
        适用场景：工具流式输出 JSON（如 naabu -json）
        
        Args:
            cmd: 要执行的命令
            tool_name: 工具名称（用于日志记录）
            cwd: 工作目录
            shell: 是否使用 shell 执行
            encoding: 编码格式
            suffix_char: 末尾后缀字符（用于移除）
            timeout: 命令执行超时时间（秒），None 表示不设置超时
            log_file: 日志文件路径（可选）
        
        Yields:
            str: 每行输出的内容（已处理：去空白、去ANSI、去后缀）
            
        Raises:
            subprocess.TimeoutExpired: 命令执行超时
        """
        
        global _ACTIVE_COMMANDS

        # 记录开始时间（用于命令日志）
        start_time = datetime.now()
        acquired_slot = False
        
        # 准备日志文件路径
        log_file_path = Path(log_file) if log_file else None
        if log_file_path:
            logger.debug(f"日志文件: {log_file_path}")
        else:
            logger.debug("日志输出: 丢弃")
        
        # 根据是否使用shell来格式化命令
        command = cmd if shell else cmd.split()
        
        # 日志文件句柄
        log_file_handle = None

        # 启动子进程，根据日志策略决定输出方向
        if log_file_path:
            # 打开日志文件
            log_file_handle = open(log_file_path, 'w', encoding='utf-8', buffering=1)
            
            stdout_target = subprocess.PIPE
            stderr_target = log_file_handle
            if ENABLE_COMMAND_LOGGING:
                stderr_target = subprocess.STDOUT
            
            if not acquired_slot:
                # 日志模式下，在真正启动进程前做一次负载检查，并登记活动命令计数
                _wait_for_system_load()
                acquired_slot = True
                if _ACTIVE_COMMANDS_LOCK:
                    with _ACTIVE_COMMANDS_LOCK:
                        _ACTIVE_COMMANDS += 1
                        current_active = _ACTIVE_COMMANDS
                else:
                    current_active = 0
                logger.info(
                    "登记活动命令计数: tool=%s, active=%d",
                    tool_name,
                    current_active,
                )
            
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=stdout_target,
                stderr=stderr_target,
                cwd=cwd,
                universal_newlines=True,
                encoding=encoding,
                shell=shell,
                start_new_session=True  # 关键：创建新进程组
            )
        else:
            # 无日志文件：正常流式输出
            if not acquired_slot:
                # 非日志模式，同样在启动进程前做一次负载检查，并登记活动命令计数
                _wait_for_system_load()
                acquired_slot = True
                if _ACTIVE_COMMANDS_LOCK:
                    with _ACTIVE_COMMANDS_LOCK:
                        _ACTIVE_COMMANDS += 1
                        current_active = _ACTIVE_COMMANDS
                else:
                    current_active = 0
                logger.info(
                    "登记活动命令计数: tool=%s, active=%d",
                    tool_name,
                    current_active,
                )
            
            process = subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=cwd,
                universal_newlines=True,
                encoding=encoding,
                shell=shell,
                start_new_session=True  # 关键：创建新进程组
            )
            
        # 超时控制：使用 Timer 在指定时间后终止进程
        timed_out_event = threading.Event()
            
        def _kill_when_timeout():
            timed_out_event.set()
            if process.poll() is None:  # 进程还在运行
                logger.warning(f"命令执行超时（{timeout}秒），正在终止进程: {cmd}")
                self._kill_process_tree(process)  # 使用新的终止方法
            
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
                
                # 如果开启命令日志且有日志文件，同时写入日志文件
                if log_file_handle and ENABLE_COMMAND_LOGGING:
                    log_file_handle.write(line + '\n')
                    log_file_handle.flush()
                
                # 直接返回行内容，由调用者负责解析
                yield line
        
        finally:
            # 1. 停止定时器（如果还没触发）
            if timer:
                timer.cancel()
                timer.join(timeout=0.1)  # 等待 timer 线程完全结束，避免悬挂
            
            # 2. 清理进程资源
            exit_code = None
            
            if timed_out_event.is_set():
                # 超时情况：定时器已经处理了进程终止，只需获取退出码
                logger.debug("进程已被超时定时器终止，等待进程结束")
                try:
                    exit_code = process.wait(timeout=1.0)  # 等待进程完全退出
                except subprocess.TimeoutExpired:
                    logger.warning("进程在超时后仍未退出，强制终止")
                    self._kill_process_tree(process)
                    exit_code = -1
            else:
                # 正常结束：等待进程自然结束
                # 如果是被外部中断（如 CancelledError），poll() 应为 None，需要 kill
                if process.poll() is None:
                    logger.info(f"流式执行被中断，清理进程: {tool_name}")
                    self._kill_process_tree(process)
                
                try:
                    exit_code = process.wait(timeout=GRACEFUL_SHUTDOWN_TIMEOUT)
                except subprocess.TimeoutExpired:
                    logger.warning(
                        "程序未能在%d秒内自然结束，强制终止: %s",
                        GRACEFUL_SHUTDOWN_TIMEOUT, cmd
                    )
                    self._kill_process_tree(process)
                    exit_code = -2
            
            # 3. 关闭进程流
            if process.stdout:
                process.stdout.close()
            if process.stderr:
                process.stderr.close()
            
            # 4. 关闭日志文件句柄
            if log_file_handle:
                log_file_handle.close()
            
            # 5. 在日志文件开头添加命令信息（如果开启且有日志文件）
            if log_file_path and ENABLE_COMMAND_LOGGING:
                duration = (datetime.now() - start_time).total_seconds()
                success = not timed_out_event.is_set() and (exit_code == 0 if exit_code is not None else True)
                
                # 写入命令信息头部
                self._write_command_info_header(log_file_path, tool_name, cmd, duration, exit_code or 0, success, timeout)
            
            if acquired_slot:
                if _ACTIVE_COMMANDS_LOCK:
                    with _ACTIVE_COMMANDS_LOCK:
                        if _ACTIVE_COMMANDS > 0:
                            _ACTIVE_COMMANDS -= 1
                        current_active = _ACTIVE_COMMANDS
                else:
                    current_active = 0
                logger.info(
                    "释放活动命令计数: tool=%s, active=%d",
                    tool_name,
                    current_active,
                )
    
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
        执行结果字典（包含 duration 字段）
    
    Raises:
        RuntimeError: 执行失败或超时
    """
    return _executor.execute_and_wait(tool_name, command, timeout, log_file)


def execute_stream(
    cmd: str,
    tool_name: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    encoding: str = 'utf-8',
    suffix_char: Optional[str] = None,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> Generator[str, None, None]:
    """
    流式执行命令（快捷函数）
    
    适用场景：工具流式输出 JSON（如 naabu -json）
    
    Args:
        cmd: 要执行的命令
        tool_name: 工具名称
        cwd: 工作目录
        shell: 是否使用 shell 执行
        encoding: 编码格式
        suffix_char: 末尾后缀字符
        timeout: 命令执行超时时间（秒）
        log_file: 日志文件路径（可选）
    
    Yields:
        str: 每行输出的内容
        
    Raises:
        subprocess.TimeoutExpired: 命令执行超时
    """
    return _executor.execute_stream(cmd, tool_name, cwd, shell, encoding, suffix_char, timeout, log_file)
