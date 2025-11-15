import logging
import re
import subprocess
import threading
from typing import Generator, Optional

logger = logging.getLogger(__name__)


def stream_command(
    cmd: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    encoding: str = 'utf-8',
    suffix_char: Optional[str] = None,
    timeout: Optional[int] = None
) -> Generator[str, None, None]:
    """以流式运行命令,逐行返回输出。
    
    Args:
        cmd: 要执行的命令
        cwd: 工作目录
        shell: 是否使用shell执行
        encoding: 编码格式
        suffix_char: 末尾后缀字符
        timeout: 命令执行超时时间（秒），None 表示不设置超时
    
    Yields:
        每行输出的内容（字符串）
        
    Raises:
        subprocess.TimeoutExpired: 命令执行超时
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
    timed_out = False
        
    def _kill_when_timeout():
        nonlocal timed_out
        timed_out = True
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
        if process.poll() is None:
            # 进程还在运行，先尝试优雅终止
            process.terminate()
            try:
                process.wait(timeout=5)  # 给5秒时间优雅退出
            except subprocess.TimeoutExpired:
                # 仍未退出，强制杀死
                process.kill()
                process.wait()
        
        # wait()会阻塞直到进程结束，返回退出码
        exit_code = process.wait()
        
        # 如果是超时导致的终止，抛出标准异常
        if timed_out:
            raise subprocess.TimeoutExpired(cmd, timeout if timeout else 0)
        
        # 记录异常退出的情况
        if exit_code != 0:
            logger.warning(f"命令执行失败，退出码: {exit_code}")
