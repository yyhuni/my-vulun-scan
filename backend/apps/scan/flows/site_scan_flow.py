
import logging
import os
from pathlib import Path
from prefect import flow
from apps.scan.tasks.site_scan import export_site_urls_task, run_httpx_scanner_task, parse_and_save_websites_task
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
        'command': '$HOME/go/bin/httpx -l {target_file} -status-code -content-type -content-length -location -title -server -body-preview -tech-detect -cdn -vhost -random-agent -o {output_file} -json',
        'timeout': 1800  # 30分钟超时
    }
}

def calculate_timeout(url_count: int) -> int:
    """
    根据URL数量动态计算扫描超时时间。

    规则：
    - 基础时间 base = 600 秒（10 分钟）
    - 每个URL额外增加 per_url = 2 秒
    - 不设置最大上限（大量URL情况下允许更长超时，由外层流程兜底）

    返回值为上述规则计算结果。
    """
    base = 600
    per_url = 2
    return base + int(url_count * per_url)


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
        2. 用httpx进行批量请求，获取响应状态码，结果写入文件
        3. 解析httpx的结果，写入数据库
    
    工作流程：
        Step 1: 导出站点URL列表到文件（供httpx使用）
        Step 2: 使用httpx进行批量HTTP请求
        Step 3: 解析httpx结果并保存到数据库
    
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
            'executed_tasks': list
        }
    """
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(
            "="*60 + "\n" +
            "开始站点扫描\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # 创建站点扫描工作目录
        site_scan_dir = Path(scan_workspace_dir) / 'site_scan'
        site_scan_dir.mkdir(parents=True, exist_ok=True)
        
        if not site_scan_dir.is_dir():
            raise RuntimeError(f"站点扫描目录创建失败: {site_scan_dir}")
        if not os.access(site_scan_dir, os.W_OK):
            raise RuntimeError(f"站点扫描目录不可写: {site_scan_dir}")
        
        # ==================== Step 1: 导出站点URL到文件 ====================
        logger.info("Step 1: 导出站点URL列表")
        
        # 导出URL到文件
        urls_file = str(site_scan_dir / 'site_urls.txt')
        export_result = export_site_urls_task(
            target_id=target_id,
            output_file=urls_file,
            batch_size=1000  # 每次处理1000个子域名
        )
        
        logger.info(
            "✓ 站点URL导出完成 - 文件: %s, URL数量: %d, 子域名数: %d",
            export_result['output_file'],
            export_result['total_urls'],
            export_result['subdomain_count']
        )
        
        # 检查URL数量
        if export_result['total_urls'] == 0:
            logger.warning("目标下没有可用的站点URL，无法执行站点扫描")
            raise ValueError("目标下没有可用的站点URL，无法执行站点扫描")
        
        # ==================== Step 2: 使用httpx进行站点扫描 ====================
        logger.info("Step 2: 使用httpx进行站点扫描")
        
        # 计算动态超时时间
        timeout = calculate_timeout(export_result['total_urls'])
        logger.info("根据URL数量 %d 计算超时时间: %d 秒", export_result['total_urls'], timeout)
        
        # 获取httpx配置
        httpx_config = HTTPX_CONFIGS['httpx']
        
        # 运行httpx扫描
        httpx_result_file = run_httpx_scanner_task(
            tool='httpx',
            target_file=export_result['output_file'],
            result_dir=str(site_scan_dir),
            command=httpx_config['command'],
            timeout=timeout
        )
        
        # 检查扫描结果
        if not httpx_result_file:
            logger.warning("httpx扫描未生成结果文件")
            raise RuntimeError("httpx扫描失败，未生成结果文件")
        
        logger.info("✓ httpx扫描完成 - 结果文件: %s", httpx_result_file)
        
        # ==================== Step 3: 解析httpx结果文件并保存到数据库 ====================
        logger.info("Step 3: 解析httpx结果并流式保存到数据库")
        
        # 解析并保存站点扫描结果
        save_result = parse_and_save_websites_task(
            result_file=httpx_result_file,
            scan_id=scan_id,
            target_id=target_id,
            batch_size=500  # 每批 500 条，平衡性能和内存
        )
        
        logger.info(
            "✓ 保存完成 - 处理记录: %d, 创建站点: %d",
            save_result['processed_records'],
            save_result['created_websites']
        )
        
        logger.info("="*60 + "\n✓ 站点扫描完成\n" + "="*60)
        
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'scan_workspace_dir': scan_workspace_dir,
            'urls_file': export_result['output_file'],
            'httpx_result_file': httpx_result_file,
            'total_urls': export_result['total_urls'],
            'subdomain_count': export_result['subdomain_count'],
            'port_count': export_result['port_count'],
            'processed_records': save_result['processed_records'],
            'created_websites': save_result['created_websites'],
            'executed_tasks': ['export_site_urls', 'run_httpx_scanner', 'parse_and_save_websites']
        }
        
    except Exception as e:
        logger.exception("站点扫描失败: %s", e)
        raise