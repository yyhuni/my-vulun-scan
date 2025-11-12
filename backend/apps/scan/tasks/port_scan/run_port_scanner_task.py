"""
运行端口扫描工具任务

负责运行单个端口扫描工具（nmap、naabu 等）
"""

import logging
import subprocess
import os
import uuid
from pathlib import Path
from datetime import datetime
from prefect import task

logger = logging.getLogger(__name__)


@task(
    name='run_port_scanner',
    retries=0,
    log_prints=True
)
def run_port_scanner_task(
    tool: str,
    target_file: str,
    result_dir: str,
    command: str,
    timeout: int
) -> str:
    """
    运行单个端口扫描工具
    
    Args:
        tool: 扫描工具名称（用于日志和文件命名）
        target_file: 目标域名列表文件路径
        result_dir: 结果目录（已拼接好完整路径）
        command: 扫描命令模板（如：'naabu -list {target_file} -o {output_file}'）
        timeout: 命令执行超时时间（秒）
    
    Returns:
        str: 结果文件路径，失败返回空字符串
    
    Raises:
        ValueError: 参数验证失败
        RuntimeError: 扫描执行失败
    
    Note:
        - 扫描结果通过工具的 -o 参数写入结果文件
        - 只记录 stderr（错误输出），stdout 直接丢弃以节省 I/O 性能
        - 日志文件统一随 workspace 管理，默认保留 7 天自动清理
        - 文件命名格式：{tool}_{timestamp}_{uuid4}.txt
    """
    logger.info("开始运行端口扫描工具: %s - 目标文件: %s", tool, target_file)
    
    # 1. 验证参数
    if not tool:
        raise ValueError("工具名称不能为空")
    if not command:
        raise ValueError("扫描命令不能为空")
    if timeout <= 0:
        raise ValueError(f"超时时间必须大于0: {timeout}")
    if not result_dir:
        raise ValueError("结果目录不能为空")
    if not target_file:
        raise ValueError("目标文件不能为空")
    
    # 2. 验证目标文件是否存在
    target_path = Path(target_file)
    if not target_path.exists():
        raise ValueError(f"目标文件不存在: {target_file}")
    
    if target_path.stat().st_size == 0:
        logger.warning("目标文件为空: %s", target_file)
        return ""
    
    # 3. 验证结果目录
    result_path = Path(result_dir)
    if not result_path.exists():
        raise RuntimeError(f"结果目录不存在: {result_dir}")
    
    # 4. 验证目录是否可写
    if not result_path.is_dir() or not os.access(result_path, os.W_OK):
        raise RuntimeError(f"目录 {result_path} 不可写")
    
    # 生成输出文件路径（时间戳 + 短UUID，确保唯一性）
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_uuid = uuid.uuid4().hex[:4]  # 4位十六进制UUID
    file_prefix = f"{tool}_{timestamp}_{short_uuid}"
    
    output_file = result_path / f"{file_prefix}.txt"
    
    # 生成日志文件路径（记录命令的 stdout/stderr）
    log_file = result_path / f"{file_prefix}.log"
    
    # 构建命令（替换模板变量）
    actual_command = command.format(
        target_file=str(target_path),
        output_file=str(output_file)
    )
    
    try:
        logger.debug("执行命令: %s", actual_command)
        logger.debug("结果文件: %s", output_file)
        
        # 执行扫描 - 只记录 stderr，stdout 直接丢弃（节省 I/O）
        with open(log_file, 'w', encoding='utf-8') as log_f:
            result = subprocess.run(
                actual_command,
                shell=True,
                stdout=subprocess.DEVNULL,  # 丢弃标准输出
                stderr=log_f,  # 只记录错误输出
                timeout=timeout,
                check=False  # 不自动抛异常，手动处理
            )
        
        # 检查执行结果
        if result.returncode != 0:
            # 命令执行失败，读取错误日志（最后1000行）
            error_output = ""
            if log_file.exists() and log_file.stat().st_size > 0:
                try:
                    with open(log_file, 'r', encoding='utf-8') as log_f:
                        lines = log_f.readlines()
                        error_output = ''.join(lines[-1000:]) if len(lines) > 1000 else ''.join(lines)
                except Exception:
                    error_output = "(无法读取日志文件)"
            
            logger.warning(
                "扫描工具 %s 返回非零状态码: %d%s",
                tool, result.returncode,
                f"\n错误输出:\n{error_output}" if error_output else ""
            )
        
        # 验证输出文件
        if not output_file.exists():
            logger.warning(
                "扫描工具 %s 未生成结果文件: %s",
                tool, output_file
            )
            # 返回空字符串表示失败，让 Flow 层处理
            return ""
        
        # 检查文件是否为空
        file_size = output_file.stat().st_size
        if file_size == 0:
            logger.warning(
                "扫描工具 %s 生成的结果文件为空: %s",
                tool, output_file
            )
            # 返回文件路径（即使为空，也让后续步骤处理）
            return str(output_file)
        else:
            logger.info(
                "✓ 扫描完成: %s - 结果文件: %s (%.2f KB)",
                tool, output_file.name, file_size / 1024
            )
        
        return str(output_file)
        
    except subprocess.TimeoutExpired as e:
        error_msg = f"扫描工具 {tool} 执行超时（{timeout}秒）"
        logger.error(error_msg)
        # 超时时日志文件已保留
        if log_file.exists():
            logger.debug("超时日志已保存: %s", log_file)
        raise RuntimeError(error_msg) from e
    
    except subprocess.SubprocessError as e:
        error_msg = f"扫描工具 {tool} 执行失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except Exception as e:
        error_msg = f"扫描工具 {tool} 执行异常: {e}"
        logger.error(error_msg, exc_info=True)
        raise
