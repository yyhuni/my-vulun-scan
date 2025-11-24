"""
执行 URL 获取工具任务

支持两种输入模式：
1. domains_file: 域名列表文件（waymore 等域名级工具）
2. sites_file: 站点 URL 列表文件（katana 等站点级工具）

并行执行工具，流式处理输出
"""

import logging
import subprocess
from pathlib import Path
from prefect import task
from typing import Optional, List
import concurrent.futures
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


def _execute_single_target(
    command_template: str,
    target: str,
    target_type: str,
    output_file: str,
    timeout: int,
    tool_name: str
) -> int:
    """
    对单个目标执行命令
    
    Args:
        command_template: 命令模板
        target: 目标（域名或 URL）
        target_type: 目标类型（domain 或 url）
        output_file: 输出文件（追加模式）
        timeout: 超时时间
        tool_name: 工具名称
        
    Returns:
        int: 发现的 URL 数量
    """
    try:
        # 替换命令中的变量
        if target_type == 'domain':
            command = command_template.replace('{domain}', target)
        else:
            command = command_template.replace('{url}', target)
        
        command = command.replace('{output_file}', output_file)
        
        # 执行命令
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False  # 不抛出异常，手动检查返回码
        )
        
        if result.returncode != 0:
            logger.warning(f"{tool_name} 处理 {target} 失败: {result.stderr}")
            return 0
        
        # 统计新增的行数（简单统计）
        try:
            with open(output_file, 'r') as f:
                line_count = sum(1 for line in f if line.strip())
            return line_count
        except:
            return 0
            
    except subprocess.TimeoutExpired:
        logger.warning(f"{tool_name} 处理 {target} 超时")
        return 0
    except Exception as e:
        logger.error(f"{tool_name} 处理 {target} 异常: {e}")
        return 0


@task(
    name='run_url_fetcher',
    retries=0,  # 不重试，工具本身会处理
    log_prints=True
)
def run_url_fetcher_task(
    tool_name: str,
    command_template: str,
    input_file: str,
    input_type: str,
    output_file: str,
    timeout: int = 3600,
    max_workers: int = 10
) -> dict:
    """
    执行 URL 获取工具（并行处理多个目标）
    
    Args:
        tool_name: 工具名称
        command_template: 命令模板
        input_file: 输入文件路径（域名列表或站点列表）
        input_type: 输入类型（'domain' 或 'url'）
        output_file: 输出文件路径
        timeout: 单个目标的超时时间（秒）
        max_workers: 最大并行数
        
    Returns:
        dict: {
            'tool': str,  # 工具名称
            'output_file': str,  # 输出文件路径
            'url_count': int,  # 发现的 URL 数量
            'target_count': int,  # 处理的目标数量
            'success': bool
        }
    """
    try:
        logger.info(f"开始执行 {tool_name} - 输入类型: {input_type}")
        
        # 读取输入文件
        targets = []
        with open(input_file, 'r') as f:
            for line in f:
                target = line.strip()
                if target:
                    targets.append(target)
        
        if not targets:
            logger.warning(f"输入文件为空: {input_file}")
            return {
                'tool': tool_name,
                'output_file': output_file,
                'url_count': 0,
                'target_count': 0,
                'success': False
            }
        
        logger.info(f"准备处理 {len(targets)} 个目标")
        
        # 创建输出文件（清空）
        Path(output_file).parent.mkdir(parents=True, exist_ok=True)
        Path(output_file).touch()
        
        # 并行执行
        total_urls = 0
        processed = 0
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            futures = []
            for target in targets:
                future = executor.submit(
                    _execute_single_target,
                    command_template,
                    target,
                    input_type,
                    output_file,
                    timeout // len(targets),  # 分配超时时间
                    tool_name
                )
                futures.append(future)
            
            # 收集结果
            for future in concurrent.futures.as_completed(futures):
                try:
                    url_count = future.result()
                    total_urls += url_count
                    processed += 1
                    
                    if processed % 10 == 0:
                        logger.info(f"{tool_name} 进度: {processed}/{len(targets)}")
                        
                except Exception as e:
                    logger.error(f"{tool_name} 任务执行失败: {e}")
        
        # 去重输出文件中的 URL
        _deduplicate_file(output_file)
        
        # 统计最终结果
        final_count = 0
        if Path(output_file).exists():
            with open(output_file, 'r') as f:
                final_count = sum(1 for line in f if line.strip())
        
        logger.info(f"✓ {tool_name} 完成 - 处理目标: {processed}/{len(targets)}, 发现 URL: {final_count}")
        
        return {
            'tool': tool_name,
            'output_file': output_file,
            'url_count': final_count,
            'target_count': processed,
            'success': final_count > 0
        }
        
    except Exception as e:
        logger.error(f"{tool_name} 执行失败: {e}", exc_info=True)
        return {
            'tool': tool_name,
            'output_file': output_file,
            'url_count': 0,
            'target_count': 0,
            'success': False
        }


def _deduplicate_file(file_path: str):
    """文件内去重（保持顺序）"""
    try:
        seen = set()
        unique_lines = []
        
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and line not in seen:
                    seen.add(line)
                    unique_lines.append(line)
        
        with open(file_path, 'w') as f:
            for line in unique_lines:
                f.write(f"{line}\n")
                
    except Exception as e:
        logger.error(f"去重文件失败: {e}")
