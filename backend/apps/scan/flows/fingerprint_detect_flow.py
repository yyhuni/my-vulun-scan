"""
指纹识别 Flow

负责编排指纹识别的完整流程

架构：
- Flow 负责编排多个原子 Task
- 在 site_scan 后串行执行
- 使用 xingfinger 工具识别技术栈
- 流式处理输出，批量更新数据库
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_running,
)
from apps.scan.tasks.fingerprint_detect import (
    export_site_urls_for_fingerprint_task,
    run_xingfinger_and_stream_update_tech_task,
)
from apps.scan.utils import build_scan_command, setup_scan_directory, user_log, wait_for_system_load
from apps.scan.utils.fingerprint_helpers import get_fingerprint_paths

logger = logging.getLogger(__name__)


@dataclass
class FingerprintContext:
    """指纹识别上下文，用于在各函数间传递状态"""
    scan_id: int
    target_id: int
    target_name: str
    scan_workspace_dir: str
    fingerprint_dir: Optional[Path] = None
    urls_file: str = ""
    url_count: int = 0
    source: str = "website"


def calculate_fingerprint_detect_timeout(
    url_count: int,
    base_per_url: float = 10.0,
    min_timeout: int = 300
) -> int:
    """根据 URL 数量计算超时时间（最小 300 秒）"""
    return max(min_timeout, int(url_count * base_per_url))



def _export_urls(fingerprint_dir: Path, provider) -> tuple[str, int]:
    """导出 URL 到文件，返回 (urls_file, total_count)"""
    logger.info("Step 1: 导出 URL 列表")

    urls_file = str(fingerprint_dir / 'urls.txt')
    export_result = export_site_urls_for_fingerprint_task(
        output_file=urls_file,
        provider=provider,
    )

    total_count = export_result['total_count']
    logger.info("✓ URL 导出完成 - 文件: %s, 数量: %d", export_result['output_file'], total_count)

    return export_result['output_file'], total_count


def _run_single_tool(
    tool_name: str,
    tool_config: dict,
    ctx: FingerprintContext
) -> tuple[Optional[dict], Optional[dict]]:
    """执行单个指纹识别工具，返回 (stats, failed_info)"""
    # 获取指纹库路径
    lib_names = tool_config.get('fingerprint_libs', ['ehole'])
    fingerprint_paths = get_fingerprint_paths(lib_names)

    if not fingerprint_paths:
        reason = f"没有可用的指纹库: {lib_names}"
        logger.warning(reason)
        return None, {'tool': tool_name, 'reason': reason}

    # 构建命令
    tool_config_with_paths = {**tool_config, **fingerprint_paths}
    try:
        command = build_scan_command(
            tool_name=tool_name,
            scan_type='fingerprint_detect',
            command_params={'urls_file': ctx.urls_file},
            tool_config=tool_config_with_paths
        )
    except Exception as e:
        reason = f"命令构建失败: {e}"
        logger.error("构建 %s 命令失败: %s", tool_name, e)
        return None, {'tool': tool_name, 'reason': reason}

    # 计算超时时间和日志文件
    timeout = calculate_fingerprint_detect_timeout(ctx.url_count)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = ctx.fingerprint_dir / f"{tool_name}_{timestamp}.log"

    logger.info(
        "开始执行 %s 指纹识别 - URL数: %d, 超时: %ds, 指纹库: %s",
        tool_name, ctx.url_count, timeout, list(fingerprint_paths.keys())
    )
    user_log(ctx.scan_id, "fingerprint_detect", f"Running {tool_name}: {command}")

    # 执行扫描任务
    try:
        result = run_xingfinger_and_stream_update_tech_task(
            cmd=command,
            tool_name=tool_name,
            scan_id=ctx.scan_id,
            target_id=ctx.target_id,
            source=ctx.source,
            cwd=str(ctx.fingerprint_dir),
            timeout=timeout,
            log_file=str(log_file),
            batch_size=100
        )

        stats = {
            'command': command,
            'result': result,
            'timeout': timeout,
            'fingerprint_libs': list(fingerprint_paths.keys())
        }

        tool_updated = result.get('updated_count', 0)
        logger.info(
            "✓ 工具 %s 执行完成 - 处理记录: %d, 更新: %d, 未找到: %d",
            tool_name,
            result.get('processed_records', 0),
            tool_updated,
            result.get('not_found_count', 0)
        )
        user_log(
            ctx.scan_id, "fingerprint_detect",
            f"{tool_name} completed: identified {tool_updated} fingerprints"
        )
        return stats, None

    except Exception as exc:
        reason = str(exc)
        logger.error("工具 %s 执行失败: %s", tool_name, exc, exc_info=True)
        user_log(ctx.scan_id, "fingerprint_detect", f"{tool_name} failed: {reason}", "error")
        return None, {'tool': tool_name, 'reason': reason}


def _run_fingerprint_detect(enabled_tools: dict, ctx: FingerprintContext) -> tuple[dict, list]:
    """执行指纹识别任务，返回 (tool_stats, failed_tools)"""
    tool_stats = {}
    failed_tools = []

    for tool_name, tool_config in enabled_tools.items():
        stats, failed_info = _run_single_tool(tool_name, tool_config, ctx)
        if stats:
            tool_stats[tool_name] = stats
        if failed_info:
            failed_tools.append(failed_info)

    if failed_tools:
        logger.warning(
            "以下指纹识别工具执行失败: %s",
            ', '.join([f['tool'] for f in failed_tools])
        )

    return tool_stats, failed_tools


def _aggregate_results(tool_stats: dict) -> dict:
    """汇总所有工具的结果"""
    return {
        'processed_records': sum(
            s['result'].get('processed_records', 0) for s in tool_stats.values()
        ),
        'updated_count': sum(
            s['result'].get('updated_count', 0) for s in tool_stats.values()
        ),
        'created_count': sum(
            s['result'].get('created_count', 0) for s in tool_stats.values()
        ),
        'snapshot_count': sum(
            s['result'].get('snapshot_count', 0) for s in tool_stats.values()
        ),
    }


@flow(
    name="fingerprint_detect",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def fingerprint_detect_flow(
    scan_id: int,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
    provider,
) -> dict:
    """
    指纹识别 Flow

    主要功能：
        1. 从数据库导出目标下所有 WebSite URL 到文件
        2. 使用 xingfinger 进行技术栈识别
        3. 解析结果并更新 WebSite.tech 字段（合并去重）
    """
    try:
        wait_for_system_load(context="fingerprint_detect_flow")

        # 从 provider 获取 target_name
        target_name = provider.get_target_name()
        if not target_name:
            raise ValueError("无法获取 Target 名称")

        # 参数验证
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")

        logger.info(
            "开始指纹识别 - Scan ID: %s, Target: %s, Workspace: %s",
            scan_id, target_name, scan_workspace_dir
        )
        user_log(scan_id, "fingerprint_detect", "Starting fingerprint detection")

        # 创建上下文
        ctx = FingerprintContext(
            scan_id=scan_id,
            target_id=target_id,
            target_name=target_name,
            scan_workspace_dir=scan_workspace_dir,
            fingerprint_dir=setup_scan_directory(scan_workspace_dir, 'fingerprint_detect')
        )

        # Step 1: 导出 URL
        ctx.urls_file, ctx.url_count = _export_urls(ctx.fingerprint_dir, provider)

        if ctx.url_count == 0:
            logger.warning("跳过指纹识别：没有 URL 可扫描 - Scan ID: %s", scan_id)
            user_log(scan_id, "fingerprint_detect", "Skipped: no URLs to scan", "warning")
            return _build_empty_result(scan_id, target_name, scan_workspace_dir, ctx.urls_file)

        # Step 2: 工具配置信息
        logger.info("Step 2: 工具配置信息")
        logger.info("✓ 启用工具: %s", ', '.join(enabled_tools.keys()))

        # Step 3: 执行指纹识别
        logger.info("Step 3: 执行指纹识别")
        tool_stats, failed_tools = _run_fingerprint_detect(enabled_tools, ctx)

        # 汇总结果
        totals = _aggregate_results(tool_stats)
        failed_tool_names = {f['tool'] for f in failed_tools}
        successful_tools = [name for name in enabled_tools if name not in failed_tool_names]

        logger.info("✓ 指纹识别完成 - 识别指纹: %d", totals['updated_count'])
        user_log(
            scan_id, "fingerprint_detect",
            f"fingerprint_detect completed: identified {totals['updated_count']} fingerprints"
        )

        executed_tasks = ['export_site_urls_for_fingerprint']
        executed_tasks.extend([f'run_xingfinger ({tool})' for tool in tool_stats])

        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'urls_file': ctx.urls_file,
            'url_count': ctx.url_count,
            **totals,
            'executed_tasks': executed_tasks,
            'tool_stats': {
                'total': len(enabled_tools),
                'successful': len(successful_tools),
                'failed': len(failed_tools),
                'successful_tools': successful_tools,
                'failed_tools': failed_tools,
                'details': tool_stats
            }
        }

    except ValueError as e:
        logger.error("配置错误: %s", e)
        raise
    except RuntimeError as e:
        logger.error("运行时错误: %s", e)
        raise
    except Exception as e:
        logger.exception("指纹识别失败: %s", e)
        raise


def _build_empty_result(
    scan_id: int,
    target_name: str,
    scan_workspace_dir: str,
    urls_file: str
) -> dict:
    """构建空结果（无 URL 可扫描时）"""
    return {
        'success': True,
        'scan_id': scan_id,
        'target': target_name,
        'scan_workspace_dir': scan_workspace_dir,
        'urls_file': urls_file,
        'url_count': 0,
        'processed_records': 0,
        'updated_count': 0,
        'created_count': 0,
        'snapshot_count': 0,
        'executed_tasks': ['export_site_urls_for_fingerprint'],
        'tool_stats': {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'successful_tools': [],
            'failed_tools': [],
            'details': {}
        }
    }
