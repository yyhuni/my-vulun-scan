"""
URL 爬虫 Flow

主动爬取网站页面，提取 URL 和 JS 端点
工具：katana, gospider, hakrawler 等
输入：sites_file（站点 URL 列表）
"""

# Django 环境初始化
from apps.common.prefect_django_setup import setup_django_for_prefect

import logging
from pathlib import Path

from prefect import flow

from .utils import run_tools_parallel

logger = logging.getLogger(__name__)


def _export_sites_file(
    output_dir: Path,
    provider,
) -> tuple[str, int]:
    """
    导出站点 URL 列表到文件
    
    Args:
        output_dir: 输出目录
        provider: TargetProvider 实例
        
    Returns:
        tuple: (file_path, count)
    """
    from apps.scan.tasks.url_fetch import export_sites_task
    
    output_file = str(output_dir / "sites.txt")
    result = export_sites_task(
        output_file=output_file,
        provider=provider
    )
    
    count = result['asset_count']
    if count > 0:
        logger.info("✓ 站点列表导出完成 - 数量: %d", count)
    else:
        logger.warning("站点列表为空，爬虫可能无法正常工作")
    
    return output_file, count


@flow(name="sites_url_fetch_flow", log_prints=True)
def sites_url_fetch_flow(
    scan_id: int,
    target_id: int,
    output_dir: str,
    enabled_tools: dict,
    provider,
) -> dict:
    """
    URL 爬虫子 Flow

    执行流程：
    1. 导出站点 URL 列表（sites_file）
    2. 并行执行爬虫工具
    3. 返回结果文件列表

    Args:
        scan_id: 扫描 ID
        target_id: 目标 ID
        output_dir: 输出目录
        enabled_tools: 启用的爬虫工具配置
        provider: TargetProvider 实例

    Returns:
        dict: {
            'success': bool,
            'result_files': list,
            'failed_tools': list,
            'successful_tools': list,
            'sites_count': int
        }
    """
    try:
        # 从 provider 获取 target_name
        target_name = provider.get_target_name()
        if not target_name:
            raise ValueError("无法获取 Target 名称")

        output_path = Path(output_dir)

        logger.info(
            "开始 URL 爬虫 - Target: %s, Tools: %s",
            target_name, ', '.join(enabled_tools.keys())
        )

        # Step 1: 导出站点 URL 列表
        sites_file, sites_count = _export_sites_file(
            output_dir=output_path,
            provider=provider
        )
        
        # 默认值模式下，即使原本没有站点，也会有默认 URL 作为输入
        if sites_count == 0:
            logger.warning("没有可用的站点，跳过爬虫")
            return {
                'success': True,
                'result_files': [],
                'failed_tools': [],
                'successful_tools': [],
                'sites_count': 0
            }
        
        # Step 2: 并行执行爬虫工具
        result_files, failed_tools, successful_tools = run_tools_parallel(
            tools=enabled_tools,
            input_file=sites_file,
            input_type="sites_file",
            output_dir=output_path,
            scan_id=scan_id
        )
        
        logger.info(
            "✓ 爬虫完成 - 成功: %d/%d, 结果文件: %d",
            len(successful_tools), len(enabled_tools), len(result_files)
        )
        
        return {
            'success': True,
            'result_files': result_files,
            'failed_tools': failed_tools,
            'successful_tools': successful_tools,
            'sites_count': sites_count
        }
        
    except Exception as e:
        logger.error("URL 爬虫失败: %s", e, exc_info=True)
        return {
            'success': False,
            'result_files': [],
            'failed_tools': [{'tool': 'sites_url_fetch_flow', 'reason': str(e)}],
            'successful_tools': [],
            'sites_count': 0
        }
