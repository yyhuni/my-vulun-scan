import logging
import re
import subprocess
from typing import Generator, Optional

logger = logging.getLogger(__name__)


def stream_command(
    cmd: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    encoding: str = 'utf-8',
    suffix_char: Optional[str] = None
) -> Generator[str, None, None]:
    """以流式运行命令,逐行返回输出。
    
    Args:
        cmd: 要执行的命令
        cwd: 工作目录
        shell: 是否使用shell执行
        encoding: 编码格式
        suffix_char: 末尾后缀字符
    
    Yields:
        每行输出的内容（字符串）
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

    try:
        # 逐行读取进程输出，直到EOF（空字符串）
        for line in iter(lambda: process.stdout.readline(), ''):
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
        # 确保进程被正确清理，即使发生异常也会执行
        # wait()会阻塞直到进程结束，返回退出码
        exit_code = process.wait()
        # 记录异常退出的情况
        if exit_code != 0:
            logger.warning(f"命令执行失败，退出码: {exit_code}")
