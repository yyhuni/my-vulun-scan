"""
目录扫描 Flow

负责编排目录扫描的完整流程

架构：
- Flow 负责编排多个原子 Task
- 支持并发执行扫描工具（使用 ThreadPoolTaskRunner）
- 每个 Task 可独立重试
- 配置由 YAML 解析
"""

import hashlib
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

from prefect import flow

from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_running,
)
from apps.scan.tasks.directory_scan import (
    export_sites_task,
    run_and_stream_save_directories_task,
)
from apps.scan.utils import (
    build_scan_command,
    ensure_wordlist_local,
    user_log,
    wait_for_system_load,
)

logger = logging.getLogger(__name__)

# 默认最大并发数
DEFAULT_MAX_WORKERS = 5


def calculate_directory_scan_timeout(
    tool_config: dict,
    base_per_word: float = 1.0,
    min_timeout: int = 60,
) -> int:
    """
    根据字典行数计算目录扫描超时时间

    计算公式：超时时间 = 字典行数 × 每个单词基础时间
    超时范围：最小 60 秒，无上限

    Args:
        tool_config: 工具配置字典，包含 wordlist 路径
        base_per_word: 每个单词的基础时间（秒），默认 1.0秒
        min_timeout: 最小超时时间（秒），默认 60秒

    Returns:
        int: 计算出的超时时间（秒）
    """
    import os

    wordlist_path = tool_config.get('wordlist')
    if not wordlist_path:
        logger.warning("工具配置中未指定 wordlist，使用默认超时: %d秒", min_timeout)
        return min_timeout

    wordlist_path = os.path.expanduser(wordlist_path)

    if not os.path.exists(wordlist_path):
        logger.warning("字典文件不存在: %s，使用默认超时: %d秒", wordlist_path, min_timeout)
        return min_timeout

    try:
        result = subprocess.run(
            ['wc', '-l', wordlist_path],
            capture_output=True,
            text=True,
            check=True
        )
        line_count = int(result.stdout.strip().split()[0])
        timeout = max(min_timeout, int(line_count * base_per_word))

        logger.info(
            "目录扫描超时计算 - 字典: %s, 行数: %d, 基础时间: %.3f秒/词, 计算超时: %d秒",
            wordlist_path, line_count, base_per_word, timeout
        )
        return timeout

    except (subprocess.CalledProcessError, ValueError, IndexError) as e:
        logger.error("计算超时时间失败: %s", e)
        return min_timeout


def _get_max_workers(tool_config: dict, default: int = DEFAULT_MAX_WORKERS) -> int:
    """从单个工具配置中获取 max_workers 参数"""
    if not isinstance(tool_config, dict):
        return default

    max_workers = tool_config.get('max_workers') or tool_config.get('max-workers')
    if isinstance(max_workers, int) and max_workers > 0:
        return max_workers
    return default


def _export_site_urls(
    target_id: int,
    directory_scan_dir: Path,
    provider,
) -> Tuple[str, int]:
    """
    导出目标下的所有站点 URL 到文件

    Args:
        target_id: 目标 ID
        directory_scan_dir: 目录扫描目录
        provider: TargetProvider 实例

    Returns:
        tuple: (sites_file, site_count)
    """
    logger.info("Step 1: 导出目标的所有站点 URL")

    sites_file = str(directory_scan_dir / 'sites.txt')
    export_result = export_sites_task(
        output_file=sites_file,
        provider=provider,
    )

    site_count = export_result['total_count']
    logger.info(
        "✓ 站点 URL 导出完成 - 文件: %s, 数量: %d",
        export_result['output_file'],
        site_count
    )

    if site_count == 0:
        logger.warning("目标下没有站点，无法执行目录扫描")

    return export_result['output_file'], site_count


def _generate_log_filename(
    tool_name: str,
    site_url: str,
    directory_scan_dir: Path
) -> Path:
    """生成唯一的日志文件名（使用 URL 的 hash 确保并发时不会冲突）"""
    url_hash = hashlib.md5(
        site_url.encode(),
        usedforsecurity=False
    ).hexdigest()[:8]
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    return directory_scan_dir / f"{tool_name}_{url_hash}_{timestamp}.log"


def _prepare_tool_wordlist(tool_name: str, tool_config: dict) -> bool:
    """准备工具的字典文件，返回是否成功"""
    wordlist_name = tool_config.get('wordlist_name')
    if not wordlist_name:
        return True

    try:
        local_wordlist_path = ensure_wordlist_local(wordlist_name)
        tool_config['wordlist'] = local_wordlist_path
        return True
    except Exception as exc:
        logger.error("为工具 %s 准备字典失败: %s", tool_name, exc)
        return False


def _build_scan_params(
    tool_name: str,
    tool_config: dict,
    sites: List[str],
    directory_scan_dir: Path,
    site_timeout: int
) -> Tuple[List[dict], List[str]]:
    """构建所有站点的扫描参数，返回 (scan_params_list, failed_sites)"""
    scan_params_list = []
    failed_sites = []

    for idx, site_url in enumerate(sites, 1):
        try:
            command = build_scan_command(
                tool_name=tool_name,
                scan_type='directory_scan',
                command_params={'url': site_url},
                tool_config=tool_config
            )
            log_file = _generate_log_filename(tool_name, site_url, directory_scan_dir)
            scan_params_list.append({
                'idx': idx,
                'site_url': site_url,
                'command': command,
                'log_file': str(log_file),
                'timeout': site_timeout
            })
        except Exception as e:
            logger.error(
                "✗ [%d/%d] 构建 %s 命令失败: %s - 站点: %s",
                idx, len(sites), tool_name, e, site_url
            )
            failed_sites.append(site_url)

    return scan_params_list, failed_sites


def _execute_batch(
    batch_params: List[dict],
    tool_name: str,
    scan_id: int,
    target_id: int,
    directory_scan_dir: Path,
    total_sites: int
) -> Tuple[int, List[str]]:
    """执行一批扫描任务，返回 (directories_found, failed_sites)"""
    directories_found = 0
    failed_sites = []

    # 提交任务
    futures = []
    for params in batch_params:
        future = run_and_stream_save_directories_task.submit(
            cmd=params['command'],
            tool_name=tool_name,
            scan_id=scan_id,
            target_id=target_id,
            site_url=params['site_url'],
            cwd=str(directory_scan_dir),
            shell=True,
            batch_size=1000,
            timeout=params['timeout'],
            log_file=params['log_file']
        )
        futures.append((params['idx'], params['site_url'], future))

    # 等待结果
    for idx, site_url, future in futures:
        try:
            result = future.result()
            dirs_count = result.get('created_directories', 0)
            directories_found += dirs_count
            logger.info(
                "✓ [%d/%d] 站点扫描完成: %s - 发现 %d 个目录",
                idx, total_sites, site_url, dirs_count
            )
        except Exception as exc:
            failed_sites.append(site_url)
            if 'timeout' in str(exc).lower():
                logger.warning(
                    "⚠️ [%d/%d] 站点扫描超时: %s - 错误: %s",
                    idx, total_sites, site_url, exc
                )
            else:
                logger.error(
                    "✗ [%d/%d] 站点扫描失败: %s - 错误: %s",
                    idx, total_sites, site_url, exc
                )

    return directories_found, failed_sites


def _run_scans_concurrently(
    enabled_tools: dict,
    sites_file: str,
    directory_scan_dir: Path,
    scan_id: int,
    target_id: int,
) -> Tuple[int, int, List[str]]:
    """
    并发执行目录扫描任务

    Returns:
        tuple: (total_directories, processed_sites, failed_sites)
    """
    # 读取站点列表
    sites: List[str] = []
    with open(sites_file, 'r', encoding='utf-8') as f:
        sites = [line.strip() for line in f if line.strip()]

    if not sites:
        logger.warning("站点列表为空")
        return 0, 0, []

    logger.info(
        "准备并发扫描 %d 个站点，使用工具: %s",
        len(sites), ', '.join(enabled_tools.keys())
    )

    total_directories = 0
    processed_sites_count = 0
    failed_sites: List[str] = []

    for tool_name, tool_config in enabled_tools.items():
        max_workers = _get_max_workers(tool_config)

        logger.info("=" * 60)
        logger.info("使用工具: %s (并发模式, max_workers=%d)", tool_name, max_workers)
        logger.info("=" * 60)
        user_log(scan_id, "directory_scan", f"Running {tool_name}")

        # 准备字典文件
        if not _prepare_tool_wordlist(tool_name, tool_config):
            failed_sites.extend(sites)
            continue

        # 计算超时时间
        site_timeout = tool_config.get('timeout', 300)
        if site_timeout == 'auto':
            site_timeout = calculate_directory_scan_timeout(tool_config)
            logger.info("✓ 工具 %s 动态计算 timeout: %d秒", tool_name, site_timeout)

        # 构建扫描参数
        scan_params_list, build_failed = _build_scan_params(
            tool_name, tool_config, sites, directory_scan_dir, site_timeout
        )
        failed_sites.extend(build_failed)

        if not scan_params_list:
            logger.warning("没有有效的扫描任务")
            continue

        # 分批执行
        total_tasks = len(scan_params_list)
        logger.info("开始分批执行 %d 个扫描任务（每批 %d 个）...", total_tasks, max_workers)

        last_progress_percent = 0
        tool_directories = 0
        tool_processed = 0

        for batch_start in range(0, total_tasks, max_workers):
            batch_end = min(batch_start + max_workers, total_tasks)
            batch_params = scan_params_list[batch_start:batch_end]
            batch_num = batch_start // max_workers + 1

            logger.info(
                "执行第 %d 批任务（%d-%d/%d）...",
                batch_num, batch_start + 1, batch_end, total_tasks
            )

            dirs_found, batch_failed = _execute_batch(
                batch_params, tool_name, scan_id, target_id,
                directory_scan_dir, len(sites)
            )

            total_directories += dirs_found
            tool_directories += dirs_found
            tool_processed += len(batch_params) - len(batch_failed)
            processed_sites_count += len(batch_params) - len(batch_failed)
            failed_sites.extend(batch_failed)

            # 进度里程碑：每 20% 输出一次
            current_progress = int((batch_end / total_tasks) * 100)
            if current_progress >= last_progress_percent + 20:
                user_log(
                    scan_id, "directory_scan",
                    f"Progress: {batch_end}/{total_tasks} sites scanned"
                )
                last_progress_percent = (current_progress // 20) * 20

        logger.info(
            "✓ 工具 %s 执行完成 - 已处理站点: %d/%d, 发现目录: %d",
            tool_name, tool_processed, total_tasks, tool_directories
        )
        user_log(
            scan_id, "directory_scan",
            f"{tool_name} completed: found {tool_directories} directories"
        )

    if failed_sites:
        logger.warning("部分站点扫描失败: %d/%d", len(failed_sites), len(sites))

    logger.info(
        "✓ 并发目录扫描执行完成 - 成功: %d/%d, 失败: %d, 总目录数: %d",
        processed_sites_count, len(sites), len(failed_sites), total_directories
    )

    return total_directories, processed_sites_count, failed_sites


@flow(
    name="directory_scan",
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
)
def directory_scan_flow(
    scan_id: int,
    target_id: int,
    scan_workspace_dir: str,
    enabled_tools: dict,
    provider,
) -> dict:
    """
    目录扫描 Flow

    主要功能：
        1. 从 target 获取所有站点的 URL
        2. 对每个站点 URL 执行目录扫描（支持 ffuf 等工具）
        3. 流式保存扫描结果到数据库 Directory 表

    Args:
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        enabled_tools: 启用的工具配置字典
        provider: TargetProvider 实例

    Returns:
        dict: 扫描结果
    """
    try:
        wait_for_system_load(context="directory_scan_flow")

        # 从 provider 获取 target_name
        target_name = provider.get_target_name()
        if not target_name:
            raise ValueError("无法获取 Target 名称")

        logger.info(
            "开始目录扫描 - Scan ID: %s, Target: %s, Workspace: %s",
            scan_id, target_name, scan_workspace_dir
        )
        user_log(scan_id, "directory_scan", "Starting directory scan")

        # 参数验证
        if scan_id is None:
            raise ValueError("scan_id 不能为空")
        if target_id is None:
            raise ValueError("target_id 不能为空")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir 不能为空")
        if not enabled_tools:
            raise ValueError("enabled_tools 不能为空")

        # Step 0: 创建工作目录
        from apps.scan.utils import setup_scan_directory
        directory_scan_dir = setup_scan_directory(scan_workspace_dir, 'directory_scan')

        # Step 1: 导出站点 URL
        sites_file, site_count = _export_site_urls(
            target_id, directory_scan_dir, provider
        )

        if site_count == 0:
            logger.warning("跳过目录扫描：没有站点可扫描 - Scan ID: %s", scan_id)
            user_log(scan_id, "directory_scan", "Skipped: no sites to scan", "warning")
            return {
                'success': True,
                'scan_id': scan_id,
                'target': target_name,
                'scan_workspace_dir': scan_workspace_dir,
                'sites_file': sites_file,
                'site_count': 0,
                'total_directories': 0,
                'processed_sites': 0,
                'failed_sites_count': 0,
                'executed_tasks': ['export_sites']
            }

        # Step 2: 工具配置信息
        logger.info("Step 2: 工具配置信息")
        tool_info = [
            f"{name}(max_workers={_get_max_workers(cfg)})"
            for name, cfg in enabled_tools.items()
        ]
        logger.info("✓ 启用工具: %s", ', '.join(tool_info))

        # Step 3: 并发执行扫描
        logger.info("Step 3: 并发执行扫描工具并实时保存结果")
        total_directories, processed_sites, failed_sites = _run_scans_concurrently(
            enabled_tools=enabled_tools,
            sites_file=sites_file,
            directory_scan_dir=directory_scan_dir,
            scan_id=scan_id,
            target_id=target_id,
        )

        if processed_sites == 0 and site_count > 0:
            logger.warning(
                "所有站点扫描均失败 - 总站点数: %d, 失败数: %d",
                site_count, len(failed_sites)
            )

        logger.info("✓ 目录扫描完成 - 发现目录: %d", total_directories)
        user_log(
            scan_id, "directory_scan",
            f"directory_scan completed: found {total_directories} directories"
        )

        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'sites_file': sites_file,
            'site_count': site_count,
            'total_directories': total_directories,
            'processed_sites': processed_sites,
            'failed_sites_count': len(failed_sites),
            'executed_tasks': ['export_sites', 'run_and_stream_save_directories']
        }

    except Exception as e:
        logger.exception("目录扫描失败: %s", e)
        raise
