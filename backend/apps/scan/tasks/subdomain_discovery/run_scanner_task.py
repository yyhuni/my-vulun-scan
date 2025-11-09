"""
运行扫描工具任务

负责运行单个子域名扫描工具（amass、subfinder 等）
"""

import logging
import subprocess
import os
import uuid
from pathlib import Path
from datetime import datetime
from prefect import task

from apps.common.normalizer import normalize_domain
from apps.common.validators import validate_domain

logger = logging.getLogger(__name__)


@task(
    name='run_scanner',
    retries=2,
    retry_delay_seconds=10,
    timeout_seconds=3600,
    log_prints=True
)
def run_scanner_task(
    tool: str,
    target: str,
    result_dir: str,
    command: str,
    timeout: int
) -> str:
    """
    运行单个扫描工具
    
    Args:
        tool: 扫描工具名称（用于日志和文件命名）
        target: 目标域名
        result_dir: 结果目录（已拼接好完整路径，如：workspace/subdomain_discovery/）
        command: 扫描命令模板（如：'amass enum -passive -d {target} -o {output_file}'）
        timeout: 命令执行超时时间（秒）
    
    Returns:
        str: 结果文件路径
    
    Raises:
        ValueError: 参数验证失败
        RuntimeError: 扫描执行失败
    
    Note:
        - 扫描结果通过工具的 -o 参数写入结果文件
        - 工具的 stdout/stderr 输出写入日志文件，避免大量输出占用内存
        - 文件命名格式：{tool}_{timestamp}_{uuid4}.txt/log（含4位UUID确保唯一性）
        - 示例：amass_20250109_161900_a3f2.txt, amass_20250109_161900_a3f2.log
        - 日志生命周期：随 workspace 目录一起管理，默认保留 7 天（SCAN_RESULTS_RETENTION_DAYS）
        - 优点：日志和结果文件在一起，便于归档和打包；缺点：会被定时清理任务自动删除
    
    Design:
        - Task 不包含配置，由 Flow 层传入，提高灵活性和可测试性
        - 命令模板支持变量替换：{target}、{output_file}
        - 路径管理由 Flow 层统一处理，Task 只负责执行
    """
    logger.info("开始运行扫描工具: %s - 目标: %s", tool, target)
    
    # 1. 验证参数
    if not tool:
        raise ValueError("工具名称不能为空")
    if not command:
        raise ValueError("扫描命令不能为空")
    if timeout <= 0:
        raise ValueError(f"超时时间必须大于0: {timeout}")
    if not result_dir:
        raise ValueError("结果目录不能为空")
    
    # 2. 规范化和验证域名
    try:
        normalized_target = normalize_domain(target)
        validate_domain(normalized_target)
        logger.debug("域名验证通过: %s -> %s", target, normalized_target)
        target = normalized_target  # 使用规范化后的域名
    except ValueError as e:
        error_msg = f"无效的目标域名: {target} - {e}"
        logger.error(error_msg)
        raise ValueError(error_msg) from e
    
    # 3. 验证结果目录
    result_path = Path(result_dir)
    if not result_path.exists():
        raise ValueError(f"结果目录不存在: {result_dir}")
    
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
        target=target,
        output_file=str(output_file)
    )
    
    try:
        logger.debug("执行命令: %s", actual_command)
        logger.debug("结果文件: %s", output_file)
        logger.debug("日志文件: %s", log_file)
        
        # 执行扫描 - stdout/stderr 重定向到文件，避免大量输出占用内存
        with open(log_file, 'w', encoding='utf-8') as log_f:
            result = subprocess.run(
                actual_command,
                shell=True,
                stdout=log_f,
                stderr=subprocess.STDOUT,  # stderr 合并到 stdout
                timeout=timeout,
                check=False  # 不自动抛异常，手动处理
            )
        
        # 检查结果
        if result.returncode != 0:
            # 读取日志文件的最后几行用于错误报告（避免读取整个文件）
            try:
                with open(log_file, 'r', encoding='utf-8') as log_f:
                    lines = log_f.readlines()
                    last_lines = ''.join(lines[-20:]) if len(lines) > 20 else ''.join(lines)
            except Exception:
                last_lines = "(无法读取日志文件)"
            
            logger.warning(
                "扫描工具 %s 返回非零状态码: %d\n最后输出:\n%s",
                tool, result.returncode, last_lines
            )
            # 不抛异常，继续检查文件
        
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
            # 返回文件路径（即使为空，也让 merge 步骤处理）
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
        raise RuntimeError(error_msg) from e
    
    except subprocess.SubprocessError as e:
        error_msg = f"扫描工具 {tool} 执行失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except Exception as e:
        error_msg = f"扫描工具 {tool} 执行异常: {e}"
        logger.error(error_msg, exc_info=True)
        raise
