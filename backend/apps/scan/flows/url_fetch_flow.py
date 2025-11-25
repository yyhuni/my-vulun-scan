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
import subprocess
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


def calculate_timeout_by_line_count(
	tool_config: dict,
	file_path: str,
	base_per_time: int = 1,
) -> int:
	try:
		result = subprocess.run(
			['wc', '-l', file_path],
			capture_output=True,
			text=True,
			check=True,
		)
		line_count = int(result.stdout.strip().split()[0])
		timeout = line_count * base_per_time
		logger.info(
			"timeout 自动计算: 文件=%s, 行数=%d, 每行时间=%d秒, timeout=%d秒",
			file_path,
			line_count,
			base_per_time,
			timeout,
		)
		return timeout
	except Exception as e:
		logger.warning("wc -l 计算行数失败: %s，将使用默认 timeout: 600秒", e)
		return 600
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


def _get_tools_input_types(enabled_tools: dict) -> dict:
    """
    批量获取所有工具的输入类型，避免重复查询
    
    Args:
        enabled_tools: 启用的工具配置
        
    Returns:
        dict: 工具名到输入类型的映射
        
    Raises:
        ValueError: 当工具未配置或缺少 input_type 时
    """
    from apps.scan.configs.command_templates import get_command_template
    
    tool_input_types = {}
    for tool_name in enabled_tools.keys():
        template = get_command_template('url_fetch', tool_name)
        if not template:
            raise ValueError(f"工具 '{tool_name}' 未在 command_templates 中配置")
        
        # 必须显式指定 input_type
        if 'input_type' not in template:
            raise ValueError(f"工具 '{tool_name}' 缺少必需的配置项 'input_type'，请在 command_templates 中指定为 'domains_file' 或 'sites_file'")
        
        input_type = template['input_type']
        
        # 验证 input_type 的值必须是有效的
        if input_type not in ['domains_file', 'sites_file']:
            raise ValueError(f"工具 '{tool_name}' 的 input_type 配置无效：'{input_type}'，必须是 'domains_file' 或 'sites_file'")
        
        tool_input_types[tool_name] = input_type
    
    return tool_input_types


def _export_required_assets(
    enabled_tools: dict,
    target_id: int,
    scan_id: int,
    url_fetch_dir: Path
) -> tuple[dict, dict]:
    """
    根据启用的工具导出所需的资产文件
    
    注意：httpx 不参与此步骤，因为它需要的 url_file 是从其他工具的输出合并而来
    
    分析启用工具的 input_type（已验证有效性），按需导出：
    - 如果有工具需要 domains_file，导出子域名列表
    - 如果有工具需要 sites_file，导出网站 URL 列表
    
    Args:
        enabled_tools: 启用的工具配置字典
        target_id: 目标 ID
        scan_id: 扫描 ID
        url_fetch_dir: URL 获取工作目录
        
    Returns:
        tuple: (assets_files, tool_input_types)
        
        assets_files: 资产文件信息的嵌套字典，格式：
            {
                'domains_file': {
                    'file': '/path/to/domains.txt',
                    'count': 100
                },
                'sites_file': {
                    'file': '/path/to/sites.txt',
                    'count': 50
                }
            }
        
        tool_input_types: 工具名到输入类型的映射，格式：
            {
                'waymore': 'domains_file',
                'katana': 'sites_file'
            }
    
    Raises:
        ValueError: 当工具配置缺少或 input_type 无效时
    """
    from apps.scan.tasks.url_fetch import export_target_assets_task
    
    # 排除 httpx 和 uro（它们使用合并后的文件，不需要从数据库导出）
    # - httpx: 验证并保存 URL
    # - uro: 清理合并后的 URL
    non_fetcher_tools = {'httpx', 'uro'}
    fetcher_tools = {k: v for k, v in enabled_tools.items() if k not in non_fetcher_tools}
    
    # 批量获取获取工具的输入类型（已验证有效性）
    tool_input_types = _get_tools_input_types(fetcher_tools)
    
    # 收集需要的输入类型（去重）
    required_input_types = set(tool_input_types.values())
    
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
        
        # 存储为嵌套字典结构
        assets_files[input_type] = {
            'file': output_file,
            'count': result['asset_count']
        }
        
        if result['asset_count'] == 0:
            logger.warning("%s 为空，相关工具可能无法正常工作", input_type)
        else:
            logger.info("✓ %s 导出完成 - 数量: %d", input_type, result['asset_count'])
    
    return assets_files, tool_input_types


def _prepare_tool_execution(
    tool_name: str,
    tool_config: dict,
    input_type: str,
    assets_files: dict,
    url_fetch_dir: Path,
) -> dict:
    """准备单个工具的执行参数"""

    # 1. 检查输入类型是否支持
    if input_type not in ["domains_file", "sites_file"]:
        logger.warning("未知的输入类型: %s，跳过工具 %s", input_type, tool_name)
        return None

    # 获取输入文件信息
    asset_info = assets_files.get(input_type)
    if not asset_info:
        logger.warning("工具 %s 需要 %s 但文件不存在，跳过", tool_name, input_type)
        return {"error": f"缺少输入文件 {input_type}"}

    input_file = asset_info["file"]
    input_count = asset_info["count"]
    logger.info("工具 %s - 输入类型: %s, 数量: %d", tool_name, input_type, input_count)

    # 2. 生成输出文件路径（带时间戳和短 UUID 后缀）
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    short_uuid = uuid.uuid4().hex[:4]
    output_file = str(url_fetch_dir / f"{tool_name}_{timestamp}_{short_uuid}.txt")

    # 3. 构建命令
    command_params = {
        input_type: input_file,
        "output_file": output_file,
    }

    try:
        command = build_scan_command(
            tool_name=tool_name,
            scan_type="url_fetch",
            command_params=command_params,
            tool_config=tool_config,
        )
    except Exception as e:  # pragma: no cover - 防御性日志
        logger.error("构建 %s 命令失败: %s", tool_name, e)
        return {"error": f"命令构建失败: {e}"}

    # 4. 计算超时时间（支持 auto 和显式整数）
    raw_timeout = tool_config.get("timeout", 3600)
    timeout = 3600
    if isinstance(raw_timeout, str) and raw_timeout == "auto":
        # 当配置为 auto 时，根据输入文件行数自动计算
        try:
            # katana / waymore 每个站点需要更长时间，这里按 360 秒/行；其他工具默认 1 秒/行
            base_per_time = 360 if tool_name in ("katana", "waymore") else 1
            timeout = calculate_timeout_by_line_count(
                tool_config=tool_config,
                file_path=input_file,
                base_per_time=base_per_time,
            )
        except Exception as e:  # pragma: no cover - 防御性日志
            logger.warning(
                "工具 %s 自动计算 timeout 失败，将使用默认 3600 秒: %s",
                tool_name,
                e,
            )
            timeout = 3600
    else:
        try:
            timeout = int(raw_timeout)
        except (TypeError, ValueError):
            logger.warning(
                "工具 %s 的 timeout 配置无效(%s)，将使用默认 3600 秒",
                tool_name,
                raw_timeout,
            )
            timeout = 3600

    # 5. 返回执行参数
    return {
        "command": command,
        "input_file": input_file,
        "input_type": input_type,
        "output_file": output_file,
        "timeout": timeout,
    }


def _submit_tool_tasks(
    fetcher_tools: dict,
    tool_input_types: dict,
    assets_files: dict,
    url_fetch_dir: Path,
) -> tuple[dict, list]:
    """提交所有 URL 获取工具的并行任务"""

    from apps.scan.tasks.url_fetch import run_url_fetcher_task

    futures: dict[str, object] = {}
    failed_tools: list[dict] = []

    for tool_name, tool_config in fetcher_tools.items():
        # 获取缓存的输入类型（必须存在，不再使用默认回退）
        input_type = tool_input_types.get(tool_name)
        if not input_type:
            error_msg = (
                f"工具 {tool_name} 缺少 input_type 映射，请检查 command_templates 配置"
            )
            logger.error(error_msg)
            failed_tools.append({"tool": tool_name, "reason": error_msg})
            continue

        # 准备执行参数
        exec_params = _prepare_tool_execution(
            tool_name=tool_name,
            tool_config=tool_config,
            input_type=input_type,
            assets_files=assets_files,
            url_fetch_dir=url_fetch_dir,
        )

        if not exec_params:
            continue

        if "error" in exec_params:
            failed_tools.append({"tool": tool_name, "reason": exec_params["error"]})
            continue

        logger.info(
            "提交任务 - 工具: %s, 输入: %s, 超时: %d秒",
            tool_name,
            exec_params["input_type"],
            exec_params["timeout"],
        )

        # 提交并行任务
        future = run_url_fetcher_task.submit(
            tool_name=tool_name,
            command=exec_params["command"],
            timeout=exec_params["timeout"],
            output_file=exec_params["output_file"],
        )
        futures[tool_name] = future

    return futures, failed_tools


def _collect_task_results(
    futures: dict,
    failed_tools: list,
    fetcher_tools: dict
) -> tuple[list, list, list]:
    """
    收集并行任务的执行结果
    
    Args:
        futures: 并行任务的 Future 对象字典
        failed_tools: 已失败的工具列表
        fetcher_tools: 获取工具配置
        
    Returns:
        tuple: (result_files, all_failed_tools, successful_tool_names)
    """
    result_files = []
    
    # 收集任务结果
    for tool_name, future in futures.items():
        try:
            result = future.result()
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
    
    # 计算成功的工具列表
    failed_tool_names = [f['tool'] for f in failed_tools]
    successful_tool_names = [
        name for name in fetcher_tools.keys()
        if name not in failed_tool_names
    ]
    
    return result_files, failed_tools, successful_tool_names


def _run_fetchers_parallel(
    enabled_tools: dict,
    tool_input_types: dict,
    assets_files: dict,
    url_fetch_dir: Path,
    scan_id: int,
    target_id: int,
    target_name: str
) -> tuple[list, list, list]:
    """
    并行执行 URL 获取工具（写入文件）
    
    注意：httpx 不参与并行获取，它用于后续的存活验证（Step 6）
    
    Args:
        enabled_tools: 已启用的工具配置字典
        tool_input_types: 工具输入类型映射（预先计算）
        assets_files: 资产文件映射（嵌套字典结构）
        url_fetch_dir: URL 获取目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        target_name: 目标名称
        
    Returns:
        tuple: (result_files, failed_tools, successful_tool_names)
            - result_files: 成功工具的输出文件路径列表
            - failed_tools: 失败工具的名称列表
            - successful_tool_names: 成功工具的名称列表
        
    Raises:
        ValueError: 没有启用任何 URL 获取工具（httpx 不能单独使用）
        RuntimeError: 所有 URL 获取工具均失败
    """
    logger.info("Step 2: 并行执行 URL 获取工具")
    
    # 分离 httpx/uro 和其他获取工具
    # - httpx: 用于验证 URL 存活
    # - uro: 用于清理合并后的 URL
    non_fetcher_tools = {'httpx', 'uro'}
    fetcher_tools = {k: v for k, v in enabled_tools.items() if k not in non_fetcher_tools}
    
    if not fetcher_tools:
        raise ValueError(
            "URL Fetch 流程需要至少启用一个 URL 获取工具（如 waymore, katana）。"
            "httpx 仅用于验证 URL 存活状态，不能单独使用。"
        )
    
    logger.info("准备并行执行 %d 个 URL 获取工具", len(fetcher_tools))

    # 提交所有工具的并行任务
    futures, failed_tools = _submit_tool_tasks(
        fetcher_tools=fetcher_tools,
        tool_input_types=tool_input_types,
        assets_files=assets_files,
        url_fetch_dir=url_fetch_dir,
    )
    
    # 收集执行结果
    result_files, all_failed_tools, successful_tool_names = _collect_task_results(
        futures=futures,
        failed_tools=failed_tools,
        fetcher_tools=fetcher_tools
    )
    
    # 检查是否有成功的工具
    if not result_files:
        error_msg = (
            f"所有 URL 获取工具均失败 - 目标: {target_name}\n"
            f"失败详情:\n" + "\n".join(
                f"  - {f['tool']}: {f['reason']}" for f in all_failed_tools
            )
        )
        raise RuntimeError(error_msg)
    
    logger.info(
        "✓ 并行获取执行完成 - 成功: %d/%d (成功: %s, 失败: %s)",
        len(successful_tool_names), len(fetcher_tools),
        ', '.join(successful_tool_names) if successful_tool_names else '无',
        ', '.join([f['tool'] for f in all_failed_tools]) if all_failed_tools else '无'
    )
    
    return result_files, all_failed_tools, successful_tool_names


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
    logger.info("开始使用 httpx 验证 URL 存活状态...")
    
    from apps.scan.utils import build_scan_command
    from apps.scan.tasks.url_fetch import run_and_stream_save_urls_task
    
    # 1. 统计待验证的 URL 数量
    try:
        with open(merged_file, 'r') as f:
            url_count = sum(1 for _ in f)
        logger.info("待验证 URL 数量: %d", url_count)
    except Exception as e:
        logger.error("读取 URL 文件失败: %s", e)
        return 0
    
    if url_count == 0:
        logger.warning("没有需要验证的 URL")
        return 0
    
    # 2. 构建 httpx 命令
    command_params = {
        'url_file': merged_file
    }
    
    try:
        command = build_scan_command(
            tool_name='httpx',
            scan_type='url_fetch',
            command_params=command_params,
            tool_config=httpx_config
        )
        logger.debug("httpx 命令构建成功")
    except Exception as e:
        logger.error("构建 httpx 命令失败: %s", e)
        logger.warning("降级处理：将直接保存所有 URL（不验证存活）")
        return _save_urls_to_database(merged_file, scan_id, target_id)
    
    # 3. 动态计算超时时间（统一使用 calculate_timeout_by_line_count）
    raw_timeout = httpx_config.get('timeout', 'auto')
    timeout = 3600
    if isinstance(raw_timeout, str) and raw_timeout == 'auto':
        # 使用行数 × 每URL基础时间(2秒) 作为基础，再叠加 60 秒并加上 7200 秒上限
        base_timeout = calculate_timeout_by_line_count(
            tool_config=httpx_config,
            file_path=merged_file,
            base_per_time=2,
        )
        timeout = min(60 + base_timeout, 7200)
        logger.info(
            "自动计算 httpx 超时时间: %d 秒 (基础: 60秒, 每URL: 2秒, 上限: 7200秒)",
            timeout,
        )
    else:
        try:
            timeout = int(raw_timeout)
        except (TypeError, ValueError):
            logger.warning(
                "httpx 的 timeout 配置无效(%s)，将使用默认 3600 秒",
                raw_timeout,
            )
            timeout = 3600
        logger.info("使用配置的 httpx 超时时间: %d 秒", timeout)
    
    # 4. 生成日志文件路径
    from datetime import datetime
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = url_fetch_dir / f"httpx_validation_{timestamp}.log"
    
    # 5. 流式执行 httpx 并实时保存存活的 URL
    logger.info("开始流式验证和保存...")
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
        
        processed = result.get('processed_records', 0)
        saved = result.get('saved_urls', 0)
        failed = result.get('failed_urls', 0)
        
        logger.info(
            "✓ httpx 验证完成 - 处理: %d/%d, 存活: %d (%.1f%%), 失败: %d",
            processed, url_count, saved, 
            (saved / url_count * 100) if url_count > 0 else 0,
            failed
        )
        
        return saved
        
    except Exception as e:
        logger.error("httpx 流式验证失败: %s", e, exc_info=True)
        # 不再做降级处理，保持失败语义，由上层 Flow 统一处理异常
        raise


def _merge_and_deduplicate_urls(result_files: list, url_fetch_dir: Path) -> tuple[str, int]:
    """
    合并并去重 URL
    
    Args:
        result_files: 各工具的输出文件列表
        url_fetch_dir: URL 获取目录
        
    Returns:
        tuple: (merged_file, unique_url_count)
    """
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


def _clean_urls_with_uro(
    merged_file: str,
    uro_config: dict,
    url_fetch_dir: Path
) -> tuple[str, int, int]:
    """
    使用 uro 清理合并后的 URL 列表
    
    uro 功能：
    - 去除重复和相似的 URL
    - 根据扩展名过滤（whitelist/blacklist）
    - 智能过滤无效 URL
    
    Args:
        merged_file: 合并后的 URL 文件路径
        uro_config: uro 工具配置
        url_fetch_dir: URL 获取目录
        
    Returns:
        tuple: (cleaned_file, cleaned_count, removed_count)
    """
    from apps.scan.tasks.url_fetch import clean_urls_task
    
    # 提取配置参数
    raw_timeout = uro_config.get('timeout', 60)
    whitelist = uro_config.get('whitelist')
    blacklist = uro_config.get('blacklist')
    filters = uro_config.get('filters')
    
    # 计算超时时间（支持 auto 模式）
    if isinstance(raw_timeout, str) and raw_timeout == 'auto':
        # uro 是本地处理工具，速度很快，按 0.01 秒/URL 计算
        timeout = calculate_timeout_by_line_count(
            tool_config=uro_config,
            file_path=merged_file,
            base_per_time=1,  # 每 100 个 URL 约 1 秒
        )
        # 最小 30 秒，最大 300 秒
        timeout = max(30, min(timeout, 300))
        logger.info("uro 自动计算超时时间: %d 秒", timeout)
    else:
        try:
            timeout = int(raw_timeout)
        except (TypeError, ValueError):
            logger.warning("uro timeout 配置无效(%s)，使用默认 60 秒", raw_timeout)
            timeout = 60
    
    # 调用 task
    result = clean_urls_task(
        input_file=merged_file,
        output_dir=str(url_fetch_dir),
        timeout=timeout,
        whitelist=whitelist,
        blacklist=blacklist,
        filters=filters
    )
    
    # 处理结果
    if result['success']:
        return result['output_file'], result['output_count'], result['removed_count']
    else:
        # 失败时使用原始文件
        logger.warning("uro 清理失败: %s，使用原始合并文件", result.get('error', '未知错误'))
        return merged_file, result['input_count'], 0


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
        assets_files, tool_input_types = _export_required_assets(
            enabled_tools=enabled_tools,
            target_id=target_id,
            scan_id=scan_id,
            url_fetch_dir=url_fetch_dir
        )
        
        # Step 4: 并行运行获取工具（写入文件）
        logger.info("Step 4: 并行运行获取工具")
        result_files, failed_tools, successful_tool_names = _run_fetchers_parallel(
            enabled_tools=enabled_tools,
            tool_input_types=tool_input_types,
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
        
        # Step 6: 使用 uro 清理 URL（如果启用）
        url_file_for_validation = merged_file  # 默认使用合并后的文件
        uro_removed_count = 0
        
        if 'uro' in enabled_tools and enabled_tools['uro'].get('enabled', False):
            logger.info("Step 6: 使用 uro 清理 URL")
            url_file_for_validation, cleaned_count, uro_removed_count = _clean_urls_with_uro(
                merged_file=merged_file,
                uro_config=enabled_tools['uro'],
                url_fetch_dir=url_fetch_dir
            )
        else:
            logger.info("Step 6: 跳过 uro 清理（未启用）")
        
        # Step 7: 使用 httpx 验证存活并流式保存（如果启用）
        if 'httpx' in enabled_tools and enabled_tools['httpx'].get('enabled', False):
            logger.info("Step 7: 使用 httpx 验证 URL 存活并流式保存")
            validated_count = _validate_and_stream_save_urls(
                merged_file=url_file_for_validation,  # 使用清理后的文件
                httpx_config=enabled_tools['httpx'],
                url_fetch_dir=url_fetch_dir,
                scan_id=scan_id,
                target_id=target_id
            )
            saved_count = validated_count
            logger.info("✓ httpx 验证并保存完成 - 存活 URL: %d", validated_count)
        else:
            # Step 7 备选: 直接保存（不验证存活）
            logger.info("Step 7: 保存到数据库（未启用 httpx 验证）")
            saved_count = _save_urls_to_database(
                merged_file=url_file_for_validation,  # 使用清理后的文件
                scan_id=scan_id,
                target_id=target_id
            )
        
        logger.info("="*60 + "\n✓ URL 获取扫描完成\n" + "="*60)
        
        # 动态生成已执行的任务列表
        executed_tasks = ['setup_directory', 'parse_config', 'export_required_assets']
        executed_tasks.extend([f'run_fetcher ({tool})' for tool in successful_tool_names])
        executed_tasks.append('merge_and_deduplicate')
        
        # 根据是否使用 uro 添加任务
        if 'uro' in enabled_tools and enabled_tools['uro'].get('enabled', False):
            executed_tasks.append('uro_clean')
        
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