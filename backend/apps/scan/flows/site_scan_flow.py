
import logging
import os
from pathlib import Path
from prefect import flow
from apps.scan.tasks.site_scan import export_site_urls_task, run_and_stream_save_websites_task
from apps.scan.handlers.scan_flow_handlers import (
    on_scan_flow_running,
    on_scan_flow_completed,
    on_scan_flow_failed,
    on_scan_flow_cancelled,
    on_scan_flow_crashed
)

logger = logging.getLogger(__name__)

HTTPX_CONFIGS = {
    'httpx': {
        'command': '$HOME/go/bin/httpx -l {target_file} -status-code -content-type -content-length -location -title -server -body-preview -tech-detect -cdn -vhost -random-agent -json',
    }
}


def _setup_site_scan_directory(scan_workspace_dir: str) -> Path:
    """
    创建并验证站点扫描工作目录
    
    Args:
        scan_workspace_dir: 扫描工作空间目录
        
    Returns:
        Path: 站点扫描目录路径
        
    Raises:
        RuntimeError: 目录创建或验证失败
    """
    site_scan_dir = Path(scan_workspace_dir) / 'site_scan'
    site_scan_dir.mkdir(parents=True, exist_ok=True)
    
    if not site_scan_dir.is_dir():
        raise RuntimeError(f"站点扫描目录创建失败: {site_scan_dir}")
    if not os.access(site_scan_dir, os.W_OK):
        raise RuntimeError(f"站点扫描目录不可写: {site_scan_dir}")
    
    return site_scan_dir


def _export_site_urls(target_id: int, site_scan_dir: Path) -> tuple[str, int, int, int]:
    """
    导出站点 URL 到文件
    
    Args:
        target_id: 目标 ID
        site_scan_dir: 站点扫描目录
        
    Returns:
        tuple: (urls_file, total_urls, subdomain_count, port_count)
        
    Raises:
        ValueError: URL 数量为 0
    """
    logger.info("Step 1: 导出站点URL列表")
    
    urls_file = str(site_scan_dir / 'site_urls.txt')
    export_result = export_site_urls_task(
        target_id=target_id,
        output_file=urls_file,
        batch_size=1000  # 每次处理1000个子域名
    )
    
    total_urls = export_result['total_urls']
    subdomain_count = export_result['subdomain_count']
    port_count = export_result['port_count']
    
    logger.info(
        "✓ 站点URL导出完成 - 文件: %s, URL数量: %d, 子域名数: %d",
        export_result['output_file'],
        total_urls,
        subdomain_count
    )
    
    if total_urls == 0:
        logger.warning("目标下没有可用的站点URL，无法执行站点扫描")
        raise ValueError("目标下没有可用的站点URL，无法执行站点扫描")
    
    return urls_file, total_urls, subdomain_count, port_count


def _build_httpx_command(urls_file: str, total_urls: int) -> tuple[str, int]:
    """
    构建 httpx 扫描命令
    
    Args:
        urls_file: URL 文件路径
        total_urls: URL 总数
        
    Returns:
        tuple: (command, timeout)
    """
    logger.info("Step 2: 流式执行httpx扫描并实时保存到数据库")
    
    # 计算动态超时时间
    timeout = calculate_timeout(total_urls)
    logger.info("根据URL数量 %d 计算超时时间: %d 秒", total_urls, timeout)
    
    # 获取httpx配置
    httpx_config = HTTPX_CONFIGS['httpx']
    
    # 构建httpx命令（流式处理，直接从 stdout 读取，无需输出文件）
    command = httpx_config['command'].format(target_file=urls_file)
    
    logger.info(
        "httpx 超时配置: %d 秒（动态计算，基于 %d 个 URL）",
        timeout, total_urls
    )
    
    return command, timeout


def _execute_httpx_scan(
    command: str,
    scan_id: int,
    target_id: int,
    site_scan_dir: Path,
    timeout: int
) -> dict:
    """
    执行 httpx 扫描并实时保存结果
    
    Args:
        command: httpx 命令
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        site_scan_dir: 站点扫描目录
        timeout: 超时时间
        
    Returns:
        dict: 扫描结果统计
    """
    # 流式执行httpx扫描并实时保存结果
    save_result = run_and_stream_save_websites_task(
        cmd=command,
        scan_id=scan_id,
        target_id=target_id,
        cwd=str(site_scan_dir),
        shell=True,
        batch_size=500,
        timeout=timeout
    )
    
    logger.info(
        "✓ 流式处理完成 - 处理记录: %d, 创建站点: %d, 跳过（无域名）: %d, 跳过（失败）: %d",
        save_result['processed_records'],
        save_result['created_websites'],
        save_result['skipped_no_subdomain'],
        save_result['skipped_failed']
    )
    
    return save_result


def calculate_timeout(url_count: int, max_timeout: int = 86400) -> int:
    """
    根据URL数量动态计算扫描超时时间（带上限保护）。

    规则：
    - 基础时间 base = 600 秒（10 分钟）
    - 每个URL额外增加 per_url = 1 秒
    - 强制上限 max_timeout = 86400 秒（24 小时），防止资源耗尽

    Args:
        url_count: URL数量，必须为正整数
        max_timeout: 最大超时时间（秒），默认 86400（24 小时）

    Returns:
        int: 计算得到的超时时间（秒），不超过 max_timeout

    Raises:
        ValueError: 当 url_count 为负数或 0 时抛出异常
    """
    if url_count < 0:
        raise ValueError(f"URL数量不能为负数: {url_count}")
    if url_count == 0:
        raise ValueError("URL数量不能为0")

    base = 600
    per_url = 1
    timeout = base + int(url_count * per_url)
    
    # 强制上限，防止资源耗尽
    return min(timeout, max_timeout)


@flow(
    name="site_scan", 
    log_prints=True,
    on_running=[on_scan_flow_running],
    on_completion=[on_scan_flow_completed],
    on_failure=[on_scan_flow_failed],
    on_cancellation=[on_scan_flow_cancelled],
    on_crashed=[on_scan_flow_crashed]
)
def site_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_config: str = None
) -> dict:
    """
    站点扫描 Flow
    
    主要功能：
        1. 从target获取所有子域名与其对应的端口号，拼接成URL写入文件
        2. 用httpx进行批量请求并实时保存到数据库（流式处理）
    
    工作流程：
        Step 1: 导出站点URL列表到文件（供httpx使用）
        Step 2: 流式执行httpx扫描并实时保存结果到数据库
    
    Args:
        scan_id: 扫描任务ID
        target_name: 目标名称
        target_id: 目标ID
        scan_workspace_dir: 扫描工作空间目录
        engine_config: 引擎配置（预留）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'urls_file': str,
            'total_urls': int,
            'subdomain_count': int,
            'port_count': int,
            'processed_records': int,
            'created_websites': int,
            'skipped_no_subdomain': int,
            'skipped_failed': int,
            'executed_tasks': list
        }
    """
    try:
        logger.info(
            "="*60 + "\n" +
            "开始站点扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # Step 0: 创建并验证工作目录
        site_scan_dir = _setup_site_scan_directory(scan_workspace_dir)
        
        # Step 1: 导出站点 URL 到文件
        urls_file, total_urls, subdomain_count, port_count = _export_site_urls(
            target_id, site_scan_dir
        )
        
        # Step 2: 构建 httpx 扫描命令
        command, timeout = _build_httpx_command(urls_file, total_urls)
        
        # Step 3: 执行 httpx 扫描并实时保存结果
        save_result = _execute_httpx_scan(
            command, scan_id, target_id, site_scan_dir, timeout
        )
        
        # 检查是否所有站点都失败
        if save_result['created_websites'] == 0 and total_urls > 0:
            error_msg = (
                f"所有站点扫描均失败 - 总URL数: {total_urls}, "
                f"处理记录: {save_result['processed_records']}, "
                f"跳过（失败）: {save_result['skipped_failed']}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        logger.info("="*60 + "\n✓ 站点扫描完成\n" + "="*60)
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'urls_file': urls_file,
            'total_urls': total_urls,
            'subdomain_count': subdomain_count,
            'port_count': port_count,
            'processed_records': save_result['processed_records'],
            'created_websites': save_result['created_websites'],
            'skipped_no_subdomain': save_result['skipped_no_subdomain'],
            'skipped_failed': save_result['skipped_failed'],
            'executed_tasks': ['export_site_urls', 'run_and_stream_save_websites']
        }
        
    except Exception as e:
        logger.exception("站点扫描失败: %s", e)
        raise