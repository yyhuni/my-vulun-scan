"""
子域名发现服务模块

提供基于 amass 和 subfinder 的子域名扫描功能
"""

import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

from .command_executor import ScanCommandExecutor

# 配置日志
logger = logging.getLogger(__name__)


# ==================== 常量定义 ====================

# 扫描工具配置
SCAN_TOOLS = [
    {
        'name': 'amass',
        'command': 'amass enum -passive -d {target} -o {output_file}'
    },
    {
        'name': 'subfinder',
        'command': 'subfinder -d {target} -o {output_file} -silent'
    }
]

# 默认配置
DEFAULT_BASE_DIR = Path.home() / 'Desktop' / 'scan_results'
DEFAULT_TIMEOUT = 300  # 5分钟


# ==================== 核心功能 ====================

def subdomain_discovery(target: str, base_dir: str = None, timeout: int = None) -> Optional[str]:
    """
    执行子域名发现扫描，并将结果合并到单个文件
    
    Args:
        target: 目标域名（必填）
        base_dir: 扫描工作空间目录（可选，默认为 ~/Desktop/scan_results）
                 - 如果提供，将在此目录下创建 subdomain_discovery/ 模块目录
                 - 如果未提供，将在默认目录下创建带时间戳的独立目录
        timeout: 命令执行超时时间（秒，可选，默认300秒）
    
    Returns:
        合并后的文件路径（成功时）
        None（失败或无结果时）
    
    目录结构示例：
        工作空间模式（base_dir 为工作空间）：
        /scan_results/scan_123_20241104_103000/
          └── subdomain_discovery/
              ├── amass_*.txt
              ├── subfinder_*.txt
              └── merged_*.txt
        
        独立模式（base_dir 为 None）：
        ~/Desktop/scan_results/
          └── subdomain_discovery_20241104_103000123456/
              ├── amass_*.txt
              ├── subfinder_*.txt
              └── merged_*.txt
    
    Examples:
        >>> # 工作空间模式
        >>> result_file = subdomain_discovery('example.com', base_dir='/scan_results/scan_123_20241104_103000')
        >>> 
        >>> # 独立模式
        >>> result_file = subdomain_discovery('example.com')
    """
    # 参数验证
    if not target or not isinstance(target, str):
        logger.error("Invalid target provided: %s", target)
        return None
    
    # 生成唯一时间戳
    timestamp = _generate_timestamp()
    
    # 创建扫描目录
    # - 如果提供了 base_dir（工作空间），在其下创建 subdomain_discovery/ 模块目录
    # - 如果未提供，创建带时间戳的独立目录
    try:
        scan_dir = _create_scan_directory(timestamp, base_dir)
        logger.info("子域名扫描目录已创建: %s", scan_dir)
    except OSError as e:
        logger.error("创建扫描目录失败: %s", e)
        return None
    
    # 执行扫描
    scan_timeout = timeout or DEFAULT_TIMEOUT
    result_files = _execute_scan_tools(target, scan_dir, timestamp, scan_timeout)
    
    if not result_files:
        logger.warning("No scan results collected for target: %s", target)
        return None
    
    # 合并结果
    merged_file = _merge_results(scan_dir, result_files, timestamp)
    
    if merged_file and merged_file.exists():
        logger.info("Scan completed successfully. Results: %s", merged_file)
        return str(merged_file)
    else:
        logger.warning("Merged file is empty or does not exist")
        return None


def _generate_timestamp() -> str:
    """
    生成唯一时间戳
    
    格式: YYYYMMDD_HHMMSSffffff (年月日时分秒微秒)
    示例: 20251102_153045123456
    
    Returns:
        时间戳字符串
    """
    return datetime.now().strftime('%Y%m%d_%H%M%S%f')


def _create_scan_directory(timestamp: str, base_dir: str = None) -> Path:
    """
    创建扫描目录
    
    两种模式：
    1. 工作空间模式（base_dir 已存在）：
       - 在工作空间下创建模块目录：{base_dir}/subdomain_discovery/
       - 适用于多模块扫描（由 initiate_scan 创建工作空间）
    
    2. 独立模式（base_dir 为 None）：
       - 创建带时间戳的独立目录：{DEFAULT_BASE_DIR}/subdomain_discovery_{timestamp}/
       - 适用于单独运行此模块
    
    Args:
        timestamp: 时间戳字符串（独立模式使用）
        base_dir: 工作空间目录路径（可选）
    
    Returns:
        创建的扫描目录路径
    
    Raises:
        OSError: 目录创建失败
    """
    if base_dir:
        # 工作空间模式：在工作空间下创建模块目录
        base_path = Path(base_dir)
        scan_dir = base_path / "subdomain_discovery"
        logger.debug("使用工作空间模式: %s", base_path)
    else:
        # 独立模式：创建带时间戳的独立目录
        base_path = DEFAULT_BASE_DIR
        scan_dir = base_path / f"subdomain_discovery_{timestamp}"
        logger.debug("使用独立模式: %s", base_path)
    
    # 创建目录
    try:
        scan_dir.mkdir(parents=True, exist_ok=True)
        logger.debug("扫描目录已创建: %s", scan_dir)
    except OSError as e:
        logger.error("创建目录失败 %s: %s", scan_dir, e)
        raise
    
    # 验证目录是否可写
    if not scan_dir.is_dir() or not os.access(scan_dir, os.W_OK):
        error_msg = f"目录 {scan_dir} 不可写"
        logger.error(error_msg)
        raise OSError(error_msg)
    
    return scan_dir


def _execute_scan_tools(target: str, scan_dir: Path, timestamp: str, timeout: int) -> list:
    """
    执行所有配置的扫描工具
    
    Args:
        target: 目标域名
        scan_dir: 扫描输出目录
        timestamp: 时间戳字符串
        timeout: 命令执行超时时间（秒）
    
    Returns:
        成功生成的结果文件路径列表
    """
    executor = ScanCommandExecutor(timeout=timeout)
    result_files = []
    total_tools = len(SCAN_TOOLS)
    
    logger.info("Starting scan with %d tools for target: %s", total_tools, target)
    
    for idx, tool_config in enumerate(SCAN_TOOLS, 1):
        tool_name = tool_config['name']
        command_template = tool_config['command']
        
        # 为每个工具生成输出文件（使用时间戳）
        output_file = scan_dir / f"{tool_name}_{timestamp}.txt"
        
        try:
            command = command_template.format(
                target=target,
                output_file=str(output_file)
            )
            
            logger.info("[%d/%d] Executing %s", idx, total_tools, tool_name)
            executor.execute_scan_tool(tool_name, command)
            
            # 检查输出文件是否生成且非空
            if output_file.exists() and output_file.stat().st_size > 0:
                result_files.append(output_file)
                logger.info("[%d/%d] %s completed, output: %s", idx, total_tools, tool_name, output_file)
            else:
                logger.warning("[%d/%d] %s completed but no results", idx, total_tools, tool_name)
        
        except subprocess.CalledProcessError:
            logger.warning("[%d/%d] %s failed, continuing with next tool", idx, total_tools, tool_name)
            continue
    
    logger.info("Scan completed: %d/%d tools produced results", len(result_files), total_tools)
    return result_files


def _merge_results(scan_dir: Path, result_files: list, timestamp: str) -> Optional[Path]:
    """
    流式合并所有扫描结果到单个文件，并去重排序
    
    使用临时文件和系统命令实现流式处理，内存占用小
    
    Args:
        scan_dir: 扫描目录
        result_files: 要合并的结果文件列表
        timestamp: 时间戳字符串
    
    Returns:
        合并后的文件路径，如果无结果则返回 None
    """
    if not result_files:
        logger.warning("No result files to merge")
        return None
    
    merged_file = scan_dir / f"merged_{timestamp}.txt"
    temp_file = scan_dir / f"merged_{timestamp}.tmp"
    
    logger.info("Merging %d result files (streaming mode)", len(result_files))
    
    try:
        # 步骤 1: 合并所有文件到临时文件（保留重复）
        total_lines = 0
        with open(temp_file, 'w', encoding='utf-8') as out:
            for result_file in result_files:
                try:
                    with open(result_file, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith('#'):  # 跳过空行和注释
                                out.write(f"{line}\n")
                                total_lines += 1
                    
                    logger.debug("Processed %s", result_file.name)
                
                except (OSError, UnicodeDecodeError) as e:
                    logger.error("Failed to read result file %s: %s", result_file, e)
                    continue
        
        if total_lines == 0:
            logger.warning("No subdomains found in result files")
            temp_file.unlink(missing_ok=True)
            return None
        
        logger.info("Total lines before deduplication: %d", total_lines)
        
        # 步骤 2: 使用系统命令去重和排序（内存高效）
        _sort_and_deduplicate(temp_file, merged_file)
        
        # 步骤 3: 清理临时文件
        temp_file.unlink(missing_ok=True)
        
        # 步骤 4: 统计最终结果
        if merged_file.exists():
            unique_count = _count_lines(merged_file)
            logger.info("Merged %d unique subdomains to: %s", unique_count, merged_file)
            
            # 步骤 5: 删除原始工具生成的文件
            _cleanup_result_files(result_files)
            
            return merged_file
        else:
            logger.error("Merged file was not created")
            return None
    
    except (OSError, subprocess.SubprocessError) as e:
        logger.error("Failed to merge results: %s", e)
        # 清理临时文件
        temp_file.unlink(missing_ok=True)
        return None


def _sort_and_deduplicate(input_file: Path, output_file: Path) -> None:
    """
    使用系统命令对文件进行排序和去重
    
    Args:
        input_file: 输入文件路径
        output_file: 输出文件路径
    
    Raises:
        subprocess.CalledProcessError: 命令执行失败
    """
    try:
        # 使用 sort -u 命令：排序并去重
        # -u: unique，去重
        # 这是最高效的方式，系统底层优化
        subprocess.run(
            ['sort', '-u', str(input_file), '-o', str(output_file)],
            check=True,
            capture_output=True,
            encoding='utf-8'
        )
        logger.debug("Sorted and deduplicated: %s -> %s", input_file, output_file)
    
    except subprocess.CalledProcessError as e:
        logger.error("Sort command failed: %s", e.stderr if e.stderr else str(e))
        raise


def _count_lines(file_path: Path) -> int:
    """
    快速统计文件行数
    
    Args:
        file_path: 文件路径
    
    Returns:
        文件行数
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return sum(1 for _ in f)
    except (OSError, UnicodeDecodeError) as e:
        logger.error("Failed to count lines in %s: %s", file_path, e)
        return 0


def _cleanup_result_files(result_files: list) -> None:
    """
    删除原始工具生成的结果文件
    
    Args:
        result_files: 要删除的文件路径列表
    """
    deleted_count = 0
    for result_file in result_files:
        try:
            if result_file.exists():
                result_file.unlink()
                deleted_count += 1
                logger.debug("Deleted result file: %s", result_file)
        except OSError as e:
            logger.warning("Failed to delete result file %s: %s", result_file, e)
    
    logger.info("Cleaned up %d/%d result files", deleted_count, len(result_files))


# ==================== 工具函数 ====================

def get_scan_results(merged_file: str) -> list:
    """
    从合并文件中读取子域名列表
    
    Args:
        merged_file: 合并文件路径
    
    Returns:
        子域名列表
    """
    try:
        with open(merged_file, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip()]
    except (OSError, UnicodeDecodeError) as e:
        logger.error("Failed to read merged file %s: %s", merged_file, e)
        return []


def count_subdomains(merged_file: str) -> int:
    """
    统计子域名数量
    
    Args:
        merged_file: 合并文件路径
    
    Returns:
        子域名数量
    """
    return len(get_scan_results(merged_file))


# ==================== 导出接口 ====================

__all__ = ['subdomain_discovery', 'get_scan_results', 'count_subdomains']
