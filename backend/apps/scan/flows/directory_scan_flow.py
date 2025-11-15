"""
目录扫描 Flow
"""

import logging
import os
import subprocess
from pathlib import Path
from prefect import flow
from apps.scan.tasks.directory_enumeration import (
    export_sites_task,
    run_and_stream_save_directories_task
)
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)

logger = logging.getLogger(__name__)

# ffuf 配置
FFUF_CONFIG = {
    'wordlist': '~/Desktop/dirsearch_dicc.txt',
    'command': 'ffuf -w {wordlist} -u {url}/FUZZ -p 0.1-2.0 -t 10 -timeout 10 -se -ac -mc 200,201,301,302,401,403 -json'
}


def _setup_directory_scan_directory(scan_workspace_dir: str) -> Path:
    """
    创建并验证目录扫描工作目录
    
    Args:
        scan_workspace_dir: 扫描工作空间目录
        
    Returns:
        Path: 目录扫描目录路径
        
    Raises:
        RuntimeError: 目录创建或验证失败
    """
    directory_scan_dir = Path(scan_workspace_dir) / 'directory_scan'
    directory_scan_dir.mkdir(parents=True, exist_ok=True)
    
    if not directory_scan_dir.is_dir():
        raise RuntimeError(f"目录扫描目录创建失败: {directory_scan_dir}")
    if not os.access(directory_scan_dir, os.W_OK):
        raise RuntimeError(f"目录扫描目录不可写: {directory_scan_dir}")
    
    return directory_scan_dir


def _export_site_urls(target_id: int, directory_scan_dir: Path) -> tuple[str, int]:
    """
    导出目标下的所有站点 URL 到文件
    
    Args:
        target_id: 目标 ID
        directory_scan_dir: 目录扫描目录
        
    Returns:
        tuple: (sites_file, site_count)
        
    Raises:
        ValueError: 站点数量为 0
    """
    logger.info("Step 1: 导出目标的所有站点 URL")
    
    sites_file = str(directory_scan_dir / 'sites.txt')
    export_result = export_sites_task(
        target_id=target_id,
        output_file=sites_file,
        batch_size=1000  # 每次读取 1000 条，优化内存占用
    )
    
    site_count = export_result['total_count']
    
    logger.info(
        "✓ 站点 URL 导出完成 - 文件: %s, 数量: %d",
        export_result['output_file'],
        site_count
    )
    
    if site_count == 0:
        logger.warning("目标下没有站点，无法执行目录扫描")
        raise ValueError("目标下没有站点，无法执行目录扫描")
    
    return sites_file, site_count


def _run_scans_sequentially(
    sites_file: str,
    directory_scan_dir: Path,
    scan_id: int,
    target_id: int,
    site_count: int,
    target_name: str
) -> tuple[int, int, list]:
    """
    串行执行目录扫描任务
    
    Args:
        sites_file: 站点文件路径
        directory_scan_dir: 目录扫描目录
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        site_count: 站点数量
        target_name: 目标名称（用于错误日志）
        
    Returns:
        tuple: (total_directories, processed_sites, failed_sites)
    """
    logger.info(
        "Step 2 & 3: 串行执行目录扫描并实时保存结果（ffuf）"
    )
    
    # 读取站点列表
    sites = []
    with open(sites_file, 'r', encoding='utf-8') as f:
        for line in f:
            site_url = line.strip()
            if site_url:
                sites.append(site_url)
    
    logger.info("准备扫描 %d 个站点", len(sites))
    
    total_directories = 0
    processed_sites = 0
    failed_sites = []
    
    # 逐个站点执行扫描
    for idx, site_url in enumerate(sites, 1):
        logger.info(
            "[%d/%d] 开始扫描站点: %s",
            idx, len(sites), site_url
        )
        
        # 构建 ffuf 命令
        command = FFUF_CONFIG['command'].format(
            wordlist=FFUF_CONFIG['wordlist'],
            url=site_url
        )
        
        # 单个站点超时：10 分钟
        site_timeout = 600
        
        try:
            # 直接调用 task（串行执行）
            result = run_and_stream_save_directories_task(
                cmd=command,
                scan_id=scan_id,
                target_id=target_id,
                site_url=site_url,
                cwd=str(directory_scan_dir),
                shell=True,
                batch_size=500,
                timeout=site_timeout
            )
            
            total_directories += result.get('created_directories', 0)
            processed_sites += 1
            
            logger.info(
                "✓ [%d/%d] 站点扫描完成: %s - 发现 %d 个目录",
                idx, len(sites), site_url,
                result.get('created_directories', 0)
            )
            
        except subprocess.TimeoutExpired as exc:
            # 超时异常单独处理
            failed_sites.append(site_url)
            logger.error(
                "✗ [%d/%d] 站点扫描超时: %s - 超时配置: %d秒",
                idx, len(sites), site_url, site_timeout
            )
        except Exception as exc:
            # 其他异常
            failed_sites.append(site_url)
            logger.error(
                "✗ [%d/%d] 站点扫描失败: %s - 错误: %s",
                idx, len(sites), site_url, exc
            )
        
        # 每 10 个站点输出进度
        if idx % 10 == 0:
            logger.info(
                "进度: %d/%d (%.1f%%) - 已发现 %d 个目录",
                idx, len(sites), idx/len(sites)*100, total_directories
            )
    
    if failed_sites:
        logger.warning(
            "部分站点扫描失败: %d/%d",
            len(failed_sites), len(sites)
        )
    
    logger.info(
        "✓ 串行目录扫描执行完成 - 成功: %d/%d, 失败: %d, 总目录数: %d",
        processed_sites, len(sites), len(failed_sites), total_directories
    )
    
    return total_directories, processed_sites, failed_sites


@flow(
    name="directory_scan", 
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def directory_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str = None
) -> dict:
    """
    目录扫描 Flow
    
    主要功能：
        1. 从 target 获取所有站点的 URL
        2. 对每个站点 URL 执行目录扫描（ffuf）
        3. 流式保存扫描结果到数据库 Directory 表
    
    工作流程：
        Step 1: 导出站点 URL 列表到文件（供扫描工具使用）
        Step 2: 串行执行目录扫描任务，运行 ffuf 并实时解析输出
        Step 3: 流式保存到数据库（WebSite → Directory）
    
    ffuf 输出字段：
        - url: 发现的目录/文件 URL
        - length: 响应内容长度
        - status: HTTP 状态码
        - words: 响应内容单词数
        - lines: 响应内容行数
        - content_type: 内容类型
        - duration: 请求耗时
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: 扫描工作空间目录
        engine_config: 引擎配置（预留）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'sites_file': str,
            'site_count': int,
            'total_directories': int,  # 发现的总目录数
            'processed_sites': int,  # 成功处理的站点数
            'failed_sites_count': int,  # 失败的站点数
            'executed_tasks': list
        }
    
    Raises:
        ValueError: 参数错误
        RuntimeError: 执行失败
    """
    try:
        logger.info(
            "="*60 + "\n" +
            "开始目录扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # Step 0: 创建工作目录
        directory_scan_dir = _setup_directory_scan_directory(scan_workspace_dir)
        
        # Step 1: 导出站点 URL
        sites_file, site_count = _export_site_urls(target_id, directory_scan_dir)
        
        # Step 2 & 3: 串行执行 ffuf 扫描任务并实时保存
        # 每个站点固定超时 600 秒（10 分钟）
        logger.info("准备扫描 %d 个站点，每个站点超时: 600 秒（10 分钟）", site_count)
        total_directories, processed_sites, failed_sites = _run_scans_sequentially(
            sites_file=sites_file,
            directory_scan_dir=directory_scan_dir,
            scan_id=scan_id,
            target_id=target_id,
            site_count=site_count,
            target_name=target_name
        )
        
        # 检查是否所有站点都失败
        if processed_sites == 0 and site_count > 0:
            error_msg = f"所有站点扫描均失败 - 总站点数: {site_count}, 失败数: {len(failed_sites)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        logger.info("="*60 + "\n✓ 目录扫描完成\n" + "="*60)
        
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