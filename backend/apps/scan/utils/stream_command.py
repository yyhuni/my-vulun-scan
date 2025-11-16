"""
流式命令执行工具

统一管理流式命令执行，支持超时控制、输出处理等功能
"""

import logging
import re
import subprocess
import threading
from typing import Generator, Optional

logger = logging.getLogger(__name__)


class _StreamCommandRunner:
    """
    流式命令执行器
    
    职责：
    1. 以流式方式执行命令，逐行返回输出
    2. 支持超时控制
    3. 处理 ANSI 转义序列和特殊字符
    4. 确保进程正确清理
    
    使用示例：
        # 基本用法
        runner = _StreamCommandRunner()
        for line in runner.run(cmd='echo hello', shell=True):
            print(line)
        
        # 带超时
        for line in runner.run(cmd='long_command', timeout=60):
            process(line)
    """
    
    def run(
        self,
        cmd: str,
        cwd: Optional[str] = None,
        shell: bool = False,
        encoding: str = 'utf-8',
        suffix_char: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> Generator[str, None, None]:
        """
        以流式方式运行命令，逐行返回输出
        
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
            
        Examples:
            >>> runner = _StreamCommandRunner()
            >>> for line in runner.run('echo "line1\\nline2"', shell=True):
            ...     print(line)
            line1
            line2
        """
        # 记录执行的命令，便于调试和日志追踪
        logger.info(f"执行命令: {cmd}")

        # 根据是否使用shell来格式化命令
        # shell=True: 直接使用字符串，shell会自己解析
        # shell=False: 需要分割成列表 ["cmd", "arg1", "arg2"]
        command = cmd if shell else cmd.split()

        # 启动子进程，以流式方式捕获输出
        # stdout和stderr都重定向到PIPE，便于逐行读取
        # universal_newlines=True: 以文本模式打开（而不是二进制）
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # 将错误输出合并到标准输出
            cwd=cwd,
            universal_newlines=True,  # 文本模式，自动处理换行符
            encoding=encoding,  # 指定编码格式
            shell=shell
        )
            
        # 超时控制：使用 Timer 在指定时间后终止进程
        # 使用 threading.Event 保证线程安全，避免竞态条件
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
            # 逐行读取进程输出，直到EOF（空字符串）
            # stdout 不会为 None，因为我们明确设置了 stdout=subprocess.PIPE
            stdout = process.stdout
            assert stdout is not None, "stdout should not be None when stdout=PIPE"
            
            for line in iter(lambda: stdout.readline(), ''):
                if not line:
                    break
                
                # 去除行首尾的空白字符（包括换行符）
                line = line.strip()
                # 跳过空行
                if not line:
                    continue
                
                # 移除ANSI转义序列（颜色、格式等控制字符）
                # 例如: \x1B[32m绿色文本\x1B[0m -> 绿色文本
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
            # 取消定时器（如果还没触发）
            if timer:
                timer.cancel()
            
            # 确保进程被正确清理
            exit_code = None
            if process.poll() is None:
                # 进程还在运行，先尝试优雅终止
                process.terminate()
                try:
                    exit_code = process.wait(timeout=5)  # 给5秒时间优雅退出
                except subprocess.TimeoutExpired:
                    # 仍未退出，强制杀死
                    process.kill()
                    exit_code = process.wait()
            else:
                # 进程已经结束，直接获取退出码
                exit_code = process.returncode
            
            # 如果是超时导致的终止，抛出标准异常
            if timed_out_event.is_set():
                raise subprocess.TimeoutExpired(cmd, timeout if timeout else 0)
            
            # 记录异常退出的情况
            if exit_code != 0:
                logger.warning(f"命令执行失败，退出码: {exit_code}")


# 内部单例实例（不对外暴露）
_stream_command_runner = _StreamCommandRunner()


def stream_command(
    cmd: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    encoding: str = 'utf-8',
    suffix_char: Optional[str] = None,
    timeout: Optional[int] = None
) -> Generator[str, None, None]:
    """
    快捷函数：以流式方式运行命令
    
    这是 _StreamCommandRunner.run() 的快捷方式
    
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
        
    Examples:
        >>> from apps.scan.utils.stream_command import stream_command
        >>> for line in stream_command('echo hello', shell=True):
        ...     print(line)
        hello
    """
    return _stream_command_runner.run(
        cmd=cmd,
        cwd=cwd,
        shell=shell,
        encoding=encoding,
        suffix_char=suffix_char,
        timeout=timeout
    )
