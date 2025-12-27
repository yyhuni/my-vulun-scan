"""
导出站点URL到文件的Task

直接使用 HostPortMapping 表查询 host+port 组合，拼接成URL格式写入文件
使用 TargetExportService 处理默认值回退逻辑

特殊逻辑：
- 80 端口：只生成 HTTP URL（省略端口号）
- 443 端口：只生成 HTTPS URL（省略端口号）
- 其他端口：生成 HTTP 和 HTTPS 两个URL（带端口号）
"""
import logging
from pathlib import Path
from prefect import task

from apps.asset.services import HostPortMappingService
from apps.scan.services import TargetExportService, BlacklistService

logger = logging.getLogger(__name__)


def _generate_urls_from_port(host: str, port: int) -> list[str]:
    """
    根据端口生成 URL 列表
    
    - 80 端口：只生成 HTTP URL（省略端口号）
    - 443 端口：只生成 HTTPS URL（省略端口号）
    - 其他端口：生成 HTTP 和 HTTPS 两个URL（带端口号）
    """
    if port == 80:
        return [f"http://{host}"]
    elif port == 443:
        return [f"https://{host}"]
    else:
        return [f"http://{host}:{port}", f"https://{host}:{port}"]


@task(name="export_site_urls")
def export_site_urls_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的所有站点URL到文件（基于 HostPortMapping 表）
    
    数据源: HostPortMapping (host + port)
    
    特殊逻辑：
    - 80 端口：只生成 HTTP URL（省略端口号）
    - 443 端口：只生成 HTTPS URL（省略端口号）
    - 其他端口：生成 HTTP 和 HTTPS 两个URL（带端口号）
    
    懒加载模式：
    - 如果数据库为空，根据 Target 类型生成默认 URL
    - DOMAIN: http(s)://domain
    - IP: http(s)://ip
    - CIDR: 展开为所有 IP 的 URL
    
    Args:
        target_id: 目标ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次处理的批次大小
        
    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_urls': int,
            'association_count': int  # 主机端口关联数量
        }
        
    Raises:
        ValueError: 参数错误
        IOError: 文件写入失败
    """
    logger.info("开始统计站点URL - Target ID: %d, 输出文件: %s", target_id, output_file)
    
    # 确保输出目录存在
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 初始化黑名单服务
    blacklist_service = BlacklistService()
    
    # 直接查询 HostPortMapping 表，按 host 排序
    service = HostPortMappingService()
    associations = service.iter_host_port_by_target(
        target_id=target_id,
        batch_size=batch_size,
    )
    
    total_urls = 0
    association_count = 0
    
    # 流式写入文件（特殊端口逻辑）
    with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
        for assoc in associations:
            association_count += 1
            host = assoc['host']
            port = assoc['port']
            
            # 根据端口号生成URL
            for url in _generate_urls_from_port(host, port):
                if blacklist_service.filter_url(url):
                    f.write(f"{url}\n")
                    total_urls += 1
            
            if association_count % 1000 == 0:
                logger.info("已处理 %d 条关联，生成 %d 个URL...", association_count, total_urls)
    
    logger.info(
        "✓ 站点URL导出完成 - 关联数: %d, 总URL数: %d, 文件: %s",
        association_count, total_urls, str(output_path)
    )
    
    # 默认值回退模式：使用 TargetExportService
    if total_urls == 0:
        export_service = TargetExportService(blacklist_service=blacklist_service)
        total_urls = export_service._generate_default_urls(target_id, output_path)
    
    return {
        'success': True,
        'output_file': str(output_path),
        'total_urls': total_urls,
        'association_count': association_count
    }
