"""
站点扫描 Flow

负责编排站点扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持串行执行扫描工具（流式处理）
- 每个 Task 可独立重试
- 配置由 YAML 解析
"""

import logging
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from prefect import flow

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect  # noqa: F401
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_running,
)
from apps.scan.tasks.site_scan import (
    export_site_urls_task,
    run_and_stream_save_websites_task,
)
from apps.scan.utils import build_scan_command, user_log, wait_for_system_load

logger = logging.getLogger(__name__)


@dataclass
class ScanContext:
    """扫描上下文，封装扫描参数"""
    scan_id: int
    target_id: int
    target_name: str
    site_scan_dir: Path
    urls_file: str
    total_urls: int


def _count_file_lines(file_path: str) -> int:
    """使用 wc -l 统计文件行数"""
    try:
        result = subprocess.run(
            ['wc', '-l', file_path],
            capture_output=True,
            text=True,
            check=True
        )
        return int(result.stdout.strip().split()[0])
    except (subprocess.CalledProcessError, ValueError, IndexError) as e:
        logger.warning("wc -l 计算行数失败: %s，返回 0", e)
        return 0


def _calculate_timeout_by_line_count(
    file_path: str,
    base_per_time: int = 1,
    min_timeout: int = 60
) -> int:
    """
    根据文件行数计算 timeout

    Args:
        file_path: 要统计行数的文件路径
        base_per_time: 每行的基础时间（秒），默认1秒
        min_timeout: 最小超时时间（秒），默认60秒

    Returns:
        int: 计算出的超时时间（秒），不低于 min_timeout
    """
    line_count = _count_file_lines(file_path)
    timeout = max(line_count * base_per_time, min_timeout)

    logger.info(
        "timeout 自动计算: 文件=%s, 行数=%d, 每行时间=%d秒, timeout=%d秒",
        file_path, line_count, base_per_time, timeout
    )
    return timeout


def _export_site_urls(
    site_scan_dir: Path,
    provider,
) -> tuple[str, int]:
    """
    导出站点 URL 到文件

    Args:
        site_scan_dir: 站点扫描目录
        provider: TargetProvider 实例

    Returns:
        tuple: (urls_file, total_urls)
    """
    logger.info("Step 1: 导出站点URL列表")

    urls_file = str(site_scan_dir / 'site_urls.txt')
    export_result = export_site_urls_task(
        output_file=urls_file,
        provider=provider,
    )

    total_urls = export_result['total_urls']

    logger.info(
        "✓ 站点URL导出完成 - 文件: %s, URL数量: %d",
        export_result['output_file'], total_urls
    )

    if total_urls == 0:
        logger.warning("目标下没有可用的站点URL，无法执行站点扫描")

    return export_result['output_file'], total_urls


def _get_tool_timeout(tool_config: dict, urls_file: str) -> int:
    """获取工具超时时间（支持 'auto' 动态计算）"""
    config_timeout = tool_config.get('timeout', 300)

    if config_timeout == 'auto':
        return _calculate_timeout_by_line_count(urls_file, base_per_time=1)

    dynamic_timeout = _calculate_timeout_by_line_count(urls_file, base_per_time=1)
    return max(dynamic_timeout, config_timeout)


def _execute_single_tool(
    tool_name: str,
    tool_config: dict,
    ctx: ScanContext
) -> Optional[dict]:
    """
    执行单个扫描工具

    Returns:
        成功返回结果字典，失败返回 None
    """
    # 构建命令
    try:
        command = build_scan_command(
            tool_name=tool_name,
            scan_type='site_scan',
            command_params={'url_file': ctx.urls_file},
            tool_config=tool_config
        )
    except (ValueError, KeyError) as e:
        logger.error("构建 %s 命令失败: %s", tool_name, e)
        return None

    timeout = _get_tool_timeout(tool_config, ctx.urls_file)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_file = ctx.site_scan_dir / f"{tool_name}_{timestamp}.log"

    logger.info(
        "开始执行 %s 站点扫描 - URL数: %d, 超时: %ds",
        tool_name, ctx.total_urls, timeout
    )
    user_log(ctx.scan_id, "site_scan", f"Running {tool_name}: {command}")

    try:
        result = run_and_stream_save_websites_task(
            cmd=command,
            tool_name=tool_name,
            scan_id=ctx.scan_id,
            target_id=ctx.target_id,
            cwd=str(ctx.site_scan_dir),
            shell=True,
            timeout=timeout,
            log_file=str(log_file)
        )

        tool_created = result.get('created_websites', 0)
        skipped = result.get('skipped_no_subdomain', 0) + result.get('skipped_failed', 0)

        logger.info(
            "✓ 工具 %s 完成 - 处理: %d, 创建: %d, 跳过: %d",
            tool_name, result.get('processed_records', 0), tool_created, skipped
        )
        user_log(
            ctx.scan_id, "site_scan",
            f"{tool_name} completed: found {tool_created} websites"
        )

        return {'command': command, 'result': result, 'timeout': timeout}

    except subprocess.TimeoutExpired:
        logger.warning(
            "⚠️ 工具 %s 执行超时 - 超时配置: %d秒 (超时前数据已保存)",
            tool_name, timeout
        )
        user_log(
            ctx.scan_id, "site_scan",
            f"{tool_name} failed: timeout after {timeout}s", "error"
        )
    except (OSError, RuntimeError) as exc:
        logger.error("工具 %s 执行失败: %s", tool_name, exc, exc_info=True)
        user_log(ctx.scan_id, "site_scan", f"{tool_name} failed: {exc}", "error")

    return None


def _run_scans_sequentially(
    enabled_tools: dict,
    ctx: ScanContext
) -> tuple[dict, int, list, list]:
    """
    串行执行站点扫描任务

    Returns:
        tuple: (tool_stats, processed_records, successful_tools, failed_tools)
    """
    tool_stats = {}
    processed_records = 0
    failed_tools = []

    for tool_name, tool_config in enabled_tools.items():
        result = _execute_single_tool(tool_name, tool_config, ctx)

        if result:
            tool_stats[tool_name] = result
            processed_records += result['result'].get('processed_records', 0)
        else:
            failed_tools.append({'tool': tool_name, 'reason': '执行失败'})

    if failed_tools:
        logger.warning(
            "以下扫描工具执行失败: %s",
            ', '.join(f['tool'] for f in failed_tools)
        )

    if not tool_stats:
        logger.warning(
            "所有站点扫描工具均失败 - 目标: %s", ctx.target_name
        )
        return {}, 0, [], failed_tools

    successful_tools = [
        name for name in enabled_tools
        if name not in {f['tool'] for f in failed_tools}
    ]

    logger.info(
        "✓ 站点扫描执行完成 - 成功: %d/%d",
        len(tool_stats), len(enabled_tools)
    )

    return tool_stats, processed_records, successful_tools, failed_tools


def _build_empty_result(
    scan_id: int,
    target_name: str,
    scan_workspace_dir: str,
    urls_file: str,
) -> dict:
    """构建空结果（无 URL 可扫描时）"""
    return {
        'success': True,
        'scan_id': scan_id,
        'target': target_name,
        'scan_workspace_dir': scan_workspace_dir,
        'urls_file': urls_file,
        'total_urls': 0,
        'processed_records': 0,
        'created_websites': 0,
        'skipped_no_subdomain': 0,
        'skipped_failed': 0,
        'executed_tasks': ['export_site_urls'],
        'tool_stats': {
            'total': 0,
            'successful': 0,
            'failed': 0,
            'successful_tools': [],
            'failed_tools': [],
            'details': {}
        }
    }


def _aggregate_tool_results(tool_stats: dict) -> tuple[int, int, int]:
    """汇总工具结果"""
    total_created = sum(
        s['result'].get('created_websites', 0) for s in tool_stats.values()
    )
    total_skipped_no_subdomain = sum(
        s['result'].get('skipped_no_subdomain', 0) for s in tool_stats.values()
    )
    total_skipped_failed = sum(
        s['result'].get('skipped_failed', 0) for s in tool_stats.values()
    )
    return total_created, total_skipped_no_subdomain, total_skipped_failed


def _validate_flow_params(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str
) -> None:
    """验证 Flow 参数"""
    if scan_id is None:
        raise ValueError("scan_id 不能为空")
    if not target_name:
        raise ValueError("target_name 不能为空")
    if target_id is None:
        raise ValueError("target_id 不能为空")
    if not scan_workspace_dir:
        raise ValueError("scan_workspace_dir 不能为空")


@flow(
    name="site_scan",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def site_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
    provider,
) -> dict:
    """
    站点扫描 Flow

    主要功能：
        1. 从target获取所有子域名与其对应的端口号，拼接成URL写入文件
        2. 用httpx进行批量请求并实时保存到数据库（流式处理）

    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        enabled_tools: 启用的工具配置字典
        provider: TargetProvider 实例

    Returns:
        dict: 扫描结果

    Raises:
        ValueError: 配置错误
        RuntimeError: 执行失败
    """
    try:
        wait_for_system_load(context="site_scan_flow")

        logger.info(
            "开始站点扫描 - Scan ID: %s, Target: %s, Workspace: %s",
            scan_id, target_name, scan_workspace_dir
        )

        _validate_flow_params(scan_id, target_name, target_id, scan_workspace_dir)
        user_log(scan_id, "site_scan", "Starting site scan")

        # Step 0: 创建工作目录
        from apps.scan.utils import setup_scan_directory
        site_scan_dir = setup_scan_directory(scan_workspace_dir, 'site_scan')

        # Step 1: 导出站点 URL
        urls_file, total_urls = _export_site_urls(
            site_scan_dir, provider
        )

        if total_urls == 0:
            logger.warning("跳过站点扫描：没有站点 URL 可扫描 - Scan ID: %s", scan_id)
            user_log(scan_id, "site_scan", "Skipped: no site URLs to scan", "warning")
            return _build_empty_result(
                scan_id, target_name, scan_workspace_dir, urls_file
            )

        # Step 2: 工具配置信息
        logger.info("✓ 启用工具: %s", ', '.join(enabled_tools))

        # Step 3: 串行执行扫描工具
        ctx = ScanContext(
            scan_id=scan_id,
            target_id=target_id,
            target_name=target_name,
            site_scan_dir=site_scan_dir,
            urls_file=urls_file,
            total_urls=total_urls
        )

        tool_stats, processed_records, successful_tools, failed_tools = \
            _run_scans_sequentially(enabled_tools, ctx)

        # 汇总结果
        executed_tasks = ['export_site_urls', 'parse_config']
        executed_tasks.extend(
            f'run_and_stream_save_websites ({tool})' for tool in tool_stats
        )

        total_created, total_skipped_no_sub, total_skipped_failed = \
            _aggregate_tool_results(tool_stats)

        logger.info("✓ 站点扫描完成 - 创建站点: %d", total_created)
        user_log(
            scan_id, "site_scan",
            f"site_scan completed: found {total_created} websites"
        )

        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'urls_file': urls_file,
            'total_urls': total_urls,
            'processed_records': processed_records,
            'created_websites': total_created,
            'skipped_no_subdomain': total_skipped_no_sub,
            'skipped_failed': total_skipped_failed,
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

    except ValueError:
        raise
    except RuntimeError:
        raise
