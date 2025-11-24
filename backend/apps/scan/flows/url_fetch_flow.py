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


def _export_required_assets(
    enabled_tools: dict,
    target_id: int,
    scan_id: int,
    url_fetch_dir: Path
) -> dict:
    """
    根据启用的工具导出所需的资产文件
    
    分析启用工具的 input_type，按需导出：
    - 如果有工具需要 domains_file，导出域名列表
    - 如果有工具需要 sites_file，导出站点列表
    
    Args:
        enabled_tools: 启用的工具配置
        target_id: 目标 ID
        scan_id: 扫描 ID
        url_fetch_dir: URL 获取目录
        
    Returns:
        dict: 资产文件映射（只包含实际导出的资产）
            如果导出了域名：{'domains_file': 路径, 'domains_count': 数量}
            如果导出了站点：{'sites_file': 路径, 'sites_count': 数量}
    """
    from apps.scan.tasks.url_fetch import export_target_assets_task
    
    # 收集需要的输入类型
    required_input_types = set()
    for tool_name in enabled_tools.keys():
        input_type = _get_tool_input_type(tool_name)
        if input_type in ['domains_file', 'sites_file']:
            required_input_types.add(input_type)
    
    if not required_input_types:
        raise ValueError("启用的工具没有明确的输入类型配置")
    
    # 初始化结果（只存储实际导出的资产）
    assets_files = {}
    
    # 按需导出每种资产
    for input_type in required_input_types:
        # 从 input_type 生成文件名：domains_file -> domains.txt
        filename = input_type.replace('_file', '.txt')
        logger.info("导出 %s...", input_type)
        
        output_file = str(url_fetch_dir / filename)
        result = export_target_assets_task(
            output_file=output_file,
            target_id=target_id,
            scan_id=scan_id,
            input_type=input_type
        )
        
        # 存储文件路径和数量
        assets_files[input_type] = output_file
        assets_files[f"{input_type.split('_')[0]}_count"] = result['asset_count']
        
        if result['asset_count'] == 0:
            logger.warning("%s 为空，相关工具可能无法正常工作", input_type)
        else:
            logger.info("✓ %s 导出完成 - 数量: %d", input_type, result['asset_count'])
    
    return assets_files



def _get_tool_input_type(tool_name: str) -> str:
    """
    获取工具的输入类型
    
    Args:
        tool_name: 工具名称
        
    Returns:
        str: 输入类型（'domains_file' 或 'sites_file'）
    """
    from apps.scan.configs.command_templates import get_command_template
    
    template = get_command_template('url_fetch', tool_name)
    if not template:
        return 'sites_file'  # 默认为站点文件
    
    # 将模板中的 input_type 映射到文件类型
    input_type = template.get('input_type', 'sites_file')
    
    # 保持向后兼容性
    if input_type == 'domain':
        return 'domains_file'
    elif input_type == 'url' or input_type == 'url_file':
        return 'sites_file'
    else:
        return input_type  # 直接返回 domains_file 或 sites_file



def _run_fetchers_parallel(
    enabled_tools: dict,
    assets_files: dict,
    url_fetch_dir: Path,
    scan_id: int,
    target_id: int,
    target_name: str
) -> tuple[list, list, list]:
    """
    并行执行 URL 获取工具（写入文件）
    
    注意：httpx 不参与并行获取，它用于后续的存活验证
    
    根据每个工具的 input_type 选择对应的输入文件：
    - domains_file: 使用域名列表
    - sites_file: 使用站点 URL 列表
    
    Args:
        enabled_tools: 已启用的工具配置字典
        assets_files: 资产文件映射（只包含实际导出的资产）
        url_fetch_dir: URL 获取目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        target_name: 目标名称（用于错误日志）
        
    Returns:
        tuple: (result_files, failed_tools, successful_tool_names)
        
    Raises:
        RuntimeError: 所有工具均失败
    """
    logger.info("Step 2: 并行执行 URL 获取工具")
    
    # 分离 httpx（用于验证）和其他获取工具
    fetcher_tools = {k: v for k, v in enabled_tools.items() if k != 'httpx'}
    
    if not fetcher_tools:
        logger.warning("没有 URL 获取工具（排除 httpx），跳过并行获取")
        return [], [], []
    
    logger.info("准备并行执行 %d 个 URL 获取工具", len(fetcher_tools))
    
    from apps.scan.tasks.url_fetch import run_url_fetcher_task
    
    # 生成时间戳
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    result_files = []
    failed_tools = []
    futures = {}  # 存储并行任务
    
    # 并行执行每个获取工具（排除 httpx）
    for tool_name, tool_config in fetcher_tools.items():
        logger.info("使用工具: %s", tool_name)
        
        # 1. 根据工具类型选择输入文件
        input_type = _get_tool_input_type(tool_name)
        if input_type == 'domains_file':
            input_file = assets_files.get('domains_file')
            input_count = assets_files.get('domains_count', 0)
            logger.info("  输入类型: 域名文件, 域名数: %d", input_count)
        elif input_type == 'sites_file':
            input_file = assets_files.get('sites_file')
            input_count = assets_files.get('sites_count', 0)
            logger.info("  输入类型: 站点文件, 站点数: %d", input_count)
        else:
            logger.warning("  未知的输入类型: %s，跳过工具 %s", input_type, tool_name)
            continue
        
        # 检查输入文件是否存在
        if not input_file:
            logger.warning("  工具 %s 需要 %s 但文件不存在，跳过", tool_name, input_type)
            failed_tools.append({'tool': tool_name, 'reason': f'缺少输入文件 {input_type}'})
            continue
        
        # 2. 生成输出文件路径
        short_uuid = uuid.uuid4().hex[:4]
        output_file = str(url_fetch_dir / f"{tool_name}_{timestamp}_{short_uuid}.txt")
        
        # 3. 构建命令参数（根据输入类型）
        if input_type == 'domains_file':
            # 域名级别：使用域名文件
            command_params = {
                'domains_file': input_file,
                'output_file': output_file
            }
        else:  # sites_file
            # 站点级别：使用站点文件
            command_params = {
                'sites_file': input_file,
                'output_file': output_file
            }
        
        # 4. 构建命令
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='url_fetch',
                command_params=command_params,
                tool_config=tool_config
            )
        except Exception as e:
            logger.error("构建 %s 命令失败: %s", tool_name, e)
            failed_tools.append({'tool': tool_name, 'reason': f'命令构建失败: {e}'})
            continue
        
        # 5. 获取超时时间
        timeout = tool_config.get('timeout', 3600)
        
        logger.info(
            "执行获取 - 工具: %s, 输入: %s, 超时: %d秒, 输出: %s",
            tool_name, input_type, timeout, output_file
        )
        
        # 6. 提交并行任务
        logger.info(
            "提交任务 - 工具: %s, 输入: %s, 超时: %d秒, 输出: %s",
            tool_name, input_type, timeout, output_file
        )
        
        future = run_url_fetcher_task.submit(
            tool_name=tool_name,
            command_template=command,
            input_file=input_file,
            input_type=input_type,
            output_file=output_file,
            timeout=timeout
        )
        futures[tool_name] = future
    
    # 7. 等待并行任务完成，收集结果
    for tool_name, future in futures.items():
        try:
            result = future.result()  # 等待任务完成
            if result and result['success']:
                result_files.append(result['output_file'])
                logger.info(
                    "✓ 工具 %s 执行成功 - 发现 URL: %d",
                    tool_name, result['url_count']
                )
            else:
                failed_tools.append({
                    'tool': tool_name,
                    'reason': '未生成结果或无有效URL'
                })
                logger.warning("⚠️ 工具 %s 未生成有效结果", tool_name)
        except Exception as e:
            failed_tools.append({
                'tool': tool_name,
                'reason': str(e)
            })
            logger.error("工具 %s 执行失败: %s", tool_name, e)
    
    # 8. 检查是否有成功的工具
    if not result_files:
        error_msg = (
            f"所有 URL 获取工具均失败 - 目标: {target_name}\n"
            f"失败详情:\n" + "\n".join(
                f"  - {f['tool']}: {f['reason']}" for f in failed_tools
            )
        )
        raise RuntimeError(error_msg)
    
    # 9. 计算成功的工具列表
    successful_tool_names = [
        name for name in enabled_tools.keys()
        if name not in [f['tool'] for f in failed_tools]
    ]
    
    logger.info(
        "✓ 并行获取执行完成 - 成功: %d/%d (成功: %s, 失败: %s)",
        len(result_files), len(enabled_tools),
        ', '.join(successful_tool_names) if successful_tool_names else '无',
        ', '.join([f['tool'] for f in failed_tools]) if failed_tools else '无'
    )
    
    return result_files, failed_tools, successful_tool_names


def _validate_and_stream_save_urls(
    merged_file: str,
    httpx_config: dict,
    url_fetch_dir: Path,
    scan_id: int,
    target_id: int
) -> int:
    """
    使用 httpx 验证 URL 存活并流式保存到数据库
    
    工作流程：
    1. 构建 httpx 命令
    2. 流式执行 httpx，实时判断 URL 存活
    3. 存活的 URL 实时保存为 Endpoint
    
    Args:
        merged_file: 合并后的 URL 文件路径
        httpx_config: httpx 工具配置
        url_fetch_dir: URL 获取目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        
    Returns:
        int: 保存的存活 URL 数量
    """
    logger.info("使用 httpx 验证 URL 存活状态...")
    
    from apps.scan.utils import build_scan_command
    from apps.scan.tasks.url_fetch import run_and_stream_save_urls_task
    
    # 1. 构建 httpx 命令
    command_params = {
        'url_file': merged_file  # 使用合并后的 URL 文件
    }
    
    try:
        command = build_scan_command(
            tool_name='httpx',
            scan_type='url_fetch',
            command_params=command_params,
            tool_config=httpx_config
        )
    except Exception as e:
        logger.error("构建 httpx 命令失败: %s", e)
        # 如果 httpx 失败，降级为直接保存
        logger.warning("httpx 验证失败，将直接保存所有 URL（不验证存活）")
        return _save_urls_to_database(merged_file, scan_id, target_id)
    
    # 2. 获取超时配置
    timeout = httpx_config.get('timeout', 'auto')
    if timeout == 'auto':
        # 计算 URL 数量，动态设置超时
        with open(merged_file, 'r') as f:
            url_count = sum(1 for _ in f)
        timeout = min(60 + url_count * 1, 7200)  # 每个 URL 1秒，最多 2 小时
        logger.info("自动计算超时时间: %d 秒（URL 数量: %d）", timeout, url_count)
    
    # 3. 生成日志文件路径
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = url_fetch_dir / f"httpx_validation_{timestamp}.log"
    
    # 4. 流式执行 httpx 并实时保存存活的 URL
    try:
        result = run_and_stream_save_urls_task(
            cmd=command,
            tool_name='httpx',
            scan_id=scan_id,
            target_id=target_id,
            cwd=str(url_fetch_dir),
            shell=True,
            batch_size=500,  # 批量保存大小
            timeout=timeout,
            log_file=str(log_file)
        )
        
        logger.info(
            "✓ httpx 流式验证完成 - 处理: %d, 存活: %d, 失败: %d",
            result.get('processed_records', 0),
            result.get('saved_urls', 0),
            result.get('failed_urls', 0)
        )
        
        return result.get('saved_urls', 0)
        
    except Exception as e:
        logger.error("httpx 流式验证失败: %s", e, exc_info=True)
        # 降级处理：直接保存所有 URL
        logger.warning("降级处理：将直接保存所有 URL（不验证存活）")
        return _save_urls_to_database(merged_file, scan_id, target_id)


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
    
    from apps.scan.tasks.url_fetch import merge_and_deduplicate_urls_task
    
    merged_file = merge_and_deduplicate_urls_task(
        result_files=result_files,
        result_dir=str(url_fetch_dir)
    )
    
    # 统计唯一 URL 数量
    unique_url_count = 0
    if Path(merged_file).exists():
        with open(merged_file, 'r') as f:
            unique_url_count = sum(1 for line in f if line.strip())
    
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
    
    from apps.scan.tasks.url_fetch import save_urls_task
    
    result = save_urls_task(
        urls_file=merged_file,
        scan_id=scan_id,
        target_id=target_id
    )
    
    saved_count = result.get('saved_urls', 0)
    
    logger.info(
        "✓ URL 保存完成 - 保存数量: %d, 跳过: %d",
        saved_count, result.get('skipped_urls', 0)
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
    
    执行流程：
    1. 准备工作目录
    2. 解析配置，获取启用的工具
    3. 根据启用的工具导出所需的资产文件
    4. 并行运行获取工具
    5. 合并并去重 URL
    6. 保存到数据库或进行存活验证
    
    Args:
        scan_id: 扫描 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作目录
        engine_config: 引擎配置（YAML 格式字符串）
        
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
        
        # Step 1: 准备工作目录
        logger.info("Step 1: 准备工作目录")
        url_fetch_dir = _setup_url_fetch_directory(scan_workspace_dir)
        
        # Step 2: 解析配置，获取启用的工具
        logger.info("Step 2: 解析配置，获取启用的工具")
        enabled_tools = config_parser.parse_enabled_tools(
            scan_type='url_fetch',
            engine_config=engine_config
        )
        
        if not enabled_tools:
            raise RuntimeError("没有启用的 URL 获取工具，请检查引擎配置。")
        
        logger.info(
            "✓ 配置解析完成 - 启用工具: %s",
            ', '.join(enabled_tools.keys())
        )
        
        # Step 3: 根据启用的工具导出所需的资产文件
        logger.info("Step 3: 根据启用的工具导出所需的资产文件")
        assets_files = _export_required_assets(
            enabled_tools=enabled_tools,
            target_id=target_id,
            scan_id=scan_id,
            url_fetch_dir=url_fetch_dir
        )
        
        # Step 4: 并行运行获取工具（写入文件）
        logger.info("Step 4: 并行运行获取工具")
        result_files, failed_tools, successful_tool_names = _run_fetchers_parallel(
            enabled_tools=enabled_tools,
            assets_files=assets_files,
            url_fetch_dir=url_fetch_dir,
            scan_id=scan_id,
            target_id=target_id,
            target_name=target_name
        )
        
        # Step 5: 合并并去重 URL
        logger.info("Step 5: 合并并去重 URL")
        merged_file, unique_url_count = _merge_and_deduplicate_urls(
            result_files=result_files,
            url_fetch_dir=url_fetch_dir
        )
        
        # Step 6: 使用 httpx 验证存活并流式保存（如果启用）
        if 'httpx' in enabled_tools and enabled_tools['httpx'].get('enabled', False):
            logger.info("Step 6: 使用 httpx 验证 URL 存活并流式保存")
            validated_count = _validate_and_stream_save_urls(
                merged_file=merged_file,
                httpx_config=enabled_tools['httpx'],
                url_fetch_dir=url_fetch_dir,
                scan_id=scan_id,
                target_id=target_id
            )
            saved_count = validated_count
            logger.info("✓ httpx 验证并保存完成 - 存活 URL: %d", validated_count)
        else:
            # Step 6 备选: 直接保存（不验证存活）
            logger.info("Step 6: 保存到数据库（未启用 httpx 验证）")
            saved_count = _save_urls_to_database(
                merged_file=merged_file,
                scan_id=scan_id,
                target_id=target_id
            )
        
        logger.info("="*60 + "\n✓ URL 获取扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['setup_directory', 'parse_config', 'export_required_assets']
        executed_tasks.extend([f'run_fetcher ({tool})' for tool in successful_tool_names])
        executed_tasks.append('merge_and_deduplicate')
        
        # 根据是否使用 httpx 验证添加不同的任务
        if 'httpx' in enabled_tools and enabled_tools['httpx'].get('enabled', False):
            executed_tasks.append('httpx_validation_and_save')
        else:
            executed_tasks.append('save_urls')
        
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