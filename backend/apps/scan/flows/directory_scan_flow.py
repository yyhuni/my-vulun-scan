"""
目录扫描 Flow
"""

import logging
import os
from pathlib import Path
from prefect import flow
from apps.scan.tasks.directory_enumeration import export_sites_task
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)

logger = logging.getLogger(__name__)

# ffuf命令：
# ffuf -w ~/Desktop/dirsearch_dicc.txt -p 0.1-5.0 -recursion -recursion-depth 2 -t 5 -timeout 10 -se -ac -mc 200 -u {target_url}/FUZZ -json


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
        
        # TODO: Step 2 & 3: 串行执行 ffuf 扫描任务并实时保存扫描结果到数据库
        # 参考 port_scan_flow.py 的串行运行逻辑
        
        logger.info("="*60 + "\n✓ 目录扫描完成（Step 1 已实现）\n" + "="*60)
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'sites_file': sites_file,
            'site_count': site_count,
            'executed_tasks': ['export_sites']
        }
        
    except Exception as e:
        logger.exception("目录扫描失败: %s", e)
        raise