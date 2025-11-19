"""
URL 获取 Flow

负责从已知站点获取 URL 的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持串行执行获取工具（避免重复获取）
- 工具输出到文件 → 合并去重 → 保存数据库
- 每个 Task 可独立重试
- 配置由 YAML 解析

获取方式：
- 爬虫工具（katana, gospider, hakrawler）
- 信息收集（搜索引擎、API、Archive.org）
- 其他来源（日志分析、JS 文件解析等）
"""

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
import os
from pathlib import Path
from datetime import datetime
import uuid
from prefect import flow
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)
from apps.scan.utils import config_parser, build_scan_command

logger = logging.getLogger(__name__)


def _setup_url_fetch_directory(scan_workspace_dir: str) -> Path:
    """
    创建并验证 URL 获取工作目录
    
    Args:
        scan_workspace_dir: 扫描工作空间目录
        
    Returns:
        Path: URL 获取目录路径
        
    Raises:
        RuntimeError: 目录创建或验证失败
    """
    url_fetch_dir = Path(scan_workspace_dir) / 'url_fetch'
    url_fetch_dir.mkdir(parents=True, exist_ok=True)
    
    if not url_fetch_dir.is_dir():
        raise RuntimeError(f"URL 获取目录创建失败: {url_fetch_dir}")
    if not os.access(url_fetch_dir, os.W_OK):
        raise RuntimeError(f"URL 获取目录不可写: {url_fetch_dir}")
    
    return url_fetch_dir


def _export_website_urls(target_id: int, url_fetch_dir: Path) -> tuple[str, int]:
    """
    导出目标下的所有网站 URL 到文件（作为获取起点）
    
    Args:
        target_id: 目标 ID
        url_fetch_dir: URL 获取目录
        
    Returns:
        tuple: (websites_file, website_count)
        
    Raises:
        ValueError: 网站数量为 0
    """
    logger.info("Step 1: 导出网站 URL 列表（作为获取起点）")
    
    # TODO: 调用 export_websites_task
    # from apps.scan.tasks.url_fetch import export_websites_task
    # websites_file = str(url_fetch_dir / 'websites.txt')
    # result = export_websites_task(
    #     target_id=target_id,
    #     output_file=websites_file
    # )
    # website_count = result['website_count']
    
    # 占位符
    websites_file = str(url_fetch_dir / 'websites.txt')
    website_count = 0  # TODO: 从任务返回值获取
    
    logger.info(
        "✓ 网站 URL 导出完成 - 文件: %s, 网站数量: %d",
        websites_file, website_count
    )
    
    if website_count == 0:
        logger.warning("目标下没有网站，无法执行 URL 获取")
        raise ValueError("目标下没有网站，无法执行 URL 获取")
    
    return websites_file, website_count


def _run_fetchers_sequentially(
    enabled_tools: dict,
    websites_file: str,
    url_fetch_dir: Path,
    scan_id: int,
    target_id: int,
    target_name: str
) -> tuple[list, list, list]:
    """
    串行执行 URL 获取工具（写入文件）
    
    为什么串行？
    - 避免多个工具同时获取同一站点
    - 减少目标站点压力
    - 第一个工具获取后，后续工具可以跳过已获取的 URL
    
    Args:
        enabled_tools: 已启用的工具配置字典
        websites_file: 网站列表文件路径
        url_fetch_dir: URL 获取目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        target_name: 目标名称（用于错误日志）
        
    Returns:
        tuple: (result_files, failed_tools, successful_tool_names)
        
    Raises:
        RuntimeError: 所有工具均失败
    """
    logger.info("Step 2: 串行执行 URL 获取工具")
    
    # TODO: 导入任务函数
    # from apps.scan.tasks.url_fetch import run_url_fetcher_task
    
    # 生成时间戳
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    result_files = []
    failed_tools = []
    
    # 串行执行每个工具
    for tool_name, tool_config in enabled_tools.items():
        logger.info("使用工具: %s", tool_name)
        
        # 1. 生成输出文件路径
        short_uuid = uuid.uuid4().hex[:4]
        output_file = str(url_fetch_dir / f"{tool_name}_{timestamp}_{short_uuid}.txt")
        
        # 2. 构建命令
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='url_fetch',  # TODO: 添加到 command_templates.py
                command_params={
                    'input_file': websites_file,  # 网站列表作为输入
                    'output_file': output_file    # 获取的 URL 输出
                },
                tool_config=tool_config
            )
        except Exception as e:
            logger.error("构建 %s 命令失败: %s", tool_name, e)
            failed_tools.append({'tool': tool_name, 'reason': f'命令构建失败: {e}'})
            continue
        
        # 3. 获取超时时间
        timeout = tool_config.get('timeout', 3600)
        
        logger.info(
            "执行获取 - 工具: %s, 超时: %d秒, 输出: %s",
            tool_name, timeout, output_file
        )
        
        # 4. 执行获取任务
        try:
            # TODO: 调用获取任务
            # result = run_url_fetcher_task(
            #     tool=tool_name,
            #     command=command,
            #     timeout=timeout,
            #     output_file=output_file
            # )
            # if result:
            #     result_files.append(result)
            #     logger.info("✓ 工具 %s 执行成功: %s", tool_name, result)
            # else:
            #     failed_tools.append({'tool': tool_name, 'reason': '未生成结果文件'})
            
            # 占位符
            result_files.append(output_file)
            logger.info("✓ 工具 %s 执行成功 [占位符]", tool_name)
            
        except Exception as e:
            logger.error("工具 %s 执行失败: %s", tool_name, e)
            failed_tools.append({'tool': tool_name, 'reason': str(e)})
    
    # 5. 检查是否有成功的工具
    if not result_files:
        error_msg = (
            f"所有 URL 获取工具均失败 - 目标: {target_name}\n"
            f"失败详情:\n" + "\n".join(
                f"  - {f['tool']}: {f['reason']}" for f in failed_tools
            )
        )
        raise RuntimeError(error_msg)
    
    # 6. 计算成功的工具列表
    successful_tool_names = [
        name for name in enabled_tools.keys()
        if name not in [f['tool'] for f in failed_tools]
    ]
    
    logger.info(
        "✓ 串行获取执行完成 - 成功: %d/%d (成功: %s, 失败: %s)",
        len(result_files), len(enabled_tools),
        ', '.join(successful_tool_names) if successful_tool_names else '无',
        ', '.join([f['tool'] for f in failed_tools]) if failed_tools else '无'
    )
    
    return result_files, failed_tools, successful_tool_names


def _merge_and_deduplicate_urls(result_files: list, url_fetch_dir: Path) -> tuple[str, int]:
    """
    合并并去重 URL
    
    Args:
        result_files: 各工具的输出文件列表
        url_fetch_dir: URL 获取目录
        
    Returns:
        tuple: (merged_file, unique_url_count)
    """
    logger.info("Step 3: 合并并去重 URL")
    
    # TODO: 调用合并去重任务
    # from apps.scan.tasks.url_fetch import merge_and_validate_urls_task
    # merged_file = merge_and_validate_urls_task(
    #     result_files=result_files,
    #     result_dir=str(url_fetch_dir)
    # )
    
    # 占位符
    merged_file = str(url_fetch_dir / 'urls_merged.txt')
    unique_url_count = 0  # TODO: 从任务返回值获取
    
    logger.info(
        "✓ URL 合并去重完成 - 合并文件: %s, 唯一 URL 数: %d",
        merged_file, unique_url_count
    )
    
    return merged_file, unique_url_count


def _save_urls_to_database(merged_file: str, scan_id: int, target_id: int) -> int:
    """
    保存 URL 到数据库
    
    Args:
        merged_file: 合并后的 URL 文件
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        
    Returns:
        int: 保存的 URL 数量
    """
    logger.info("Step 4: 保存 URL 到数据库")
    
    # TODO: 调用保存任务
    # from apps.scan.tasks.url_fetch import save_urls_task
    # result = save_urls_task(
    #     urls_file=merged_file,
    #     scan_id=scan_id,
    #     target_id=target_id
    # )
    # saved_count = result.get('saved_urls', 0)
    
    # 占位符
    saved_count = 0  # TODO: 从任务返回值获取
    
    logger.info(
        "✓ URL 保存完成 - 保存数量: %d",
        saved_count
    )
    
    return saved_count


@flow(
    name="url_fetch",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def url_fetch_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """
    URL 获取扫描 Flow
    
    流程：
        Step 0: 准备工作（目录创建、导出网站列表）
        Step 1: 解析配置，获取启用的工具
        Step 2: 串行运行获取工具（写入文件）
        Step 3: 合并并去重 URL
        Step 4: 保存到数据库
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        engine_config: 引擎配置（YAML 字符串）
        
    Returns:
        dict: 扫描结果
            - success: 是否成功
            - scan_id: 扫描任务 ID
            - target: 目标名称
            - scan_workspace_dir: 扫描工作空间目录
            - total: 获取的 URL 总数
            - executed_tasks: 已执行的任务列表
            - tool_stats: 工具统计
    """
    try:
        logger.info(
            "="*60 + "\n" +
            "开始 URL 获取扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # Step 0: 准备工作
        url_fetch_dir = _setup_url_fetch_directory(scan_workspace_dir)
        websites_file, website_count = _export_website_urls(target_id, url_fetch_dir)
        
        # Step 1: 解析配置，获取启用的工具
        logger.info("Step 1: 解析配置，获取启用的工具")
        enabled_tools = config_parser.parse_enabled_tools(
            scan_type='url_fetch',  # TODO: 添加到 engine_config_example.yaml
            engine_config=engine_config
        )
        
        if not enabled_tools:
            raise RuntimeError("没有启用的 URL 获取工具，请检查引擎配置。")
        
        logger.info(
            "✓ 配置解析完成 - 启用工具: %s",
            ', '.join(enabled_tools.keys())
        )
        
        # Step 2: 串行运行获取工具（写入文件）
        result_files, failed_tools, successful_tool_names = _run_fetchers_sequentially(
            enabled_tools=enabled_tools,
            websites_file=websites_file,
            url_fetch_dir=url_fetch_dir,
            scan_id=scan_id,
            target_id=target_id,
            target_name=target_name
        )
        
        # Step 3: 合并并去重 URL
        merged_file, unique_url_count = _merge_and_deduplicate_urls(
            result_files=result_files,
            url_fetch_dir=url_fetch_dir
        )
        
        # Step 4: 保存到数据库
        saved_count = _save_urls_to_database(
            merged_file=merged_file,
            scan_id=scan_id,
            target_id=target_id
        )
        
        logger.info("="*60 + "\n✓ URL 获取扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['export_websites', 'parse_config']
        executed_tasks.extend([f'run_fetcher ({tool})' for tool in successful_tool_names])
        executed_tasks.extend(['merge_and_deduplicate', 'save_urls'])
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'total': saved_count,
            'executed_tasks': executed_tasks,
            'tool_stats': {
                'total': len(enabled_tools),
                'successful': len(successful_tool_names),
                'failed': len(failed_tools),
                'successful_tools': successful_tool_names,
                'failed_tools': [f['tool'] for f in failed_tools]
            }
        }
        
    except Exception as e:
        logger.error("URL 获取扫描失败: %s", e, exc_info=True)
        raise