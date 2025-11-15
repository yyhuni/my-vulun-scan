"""
导出站点URL到文件的Task

从target获取所有子域名与其对应的端口号，拼接成URL格式写入文件
"""
import logging
from pathlib import Path
from prefect import task
from django.db import models

from apps.asset.models import Subdomain, Port

logger = logging.getLogger(__name__)


@task(name="export_site_urls")
def export_site_urls_task(
    target_id: int,
    output_file: str,
    batch_size: int = 1000
) -> dict:
    """
    导出目标下的所有子域名和端口拼接成的URL到文件
    
    功能：
    1. 从target获取所有子域名
    2. 获取每个子域名对应的端口号
    3. 拼接成URL格式（标准端口80/443将省略端口号）
    4. 写入到指定文件中
    
    Args:
        target_id: 目标ID
        output_file: 输出文件路径（绝对路径）
        batch_size: 每次处理的批次大小，默认1000
        
    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_urls': int,
            'subdomain_count': int,
            'port_count': int
        }
        
    Raises:
        ValueError: 参数错误
        IOError: 文件写入失败
    """
    try:
        logger.info("开始导出站点URL - Target ID: %d, 输出文件: %s", target_id, output_file)
        
        # 确保输出目录存在
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 查询目标下所有子域名及其关联的端口
        # 使用prefetch_related优化查询性能，确保预加载所有端口信息
        subdomains = Subdomain.objects.filter(
            target_id=target_id
        ).prefetch_related(
            'ports'  # 预加载端口信息
        ).order_by('name')
        
        # 强制执行查询并预加载所有关联数据，避免N+1问题
        subdomains = list(subdomains)
        
        total_urls = 0
        subdomain_count = 0
        port_count = 0
        
        # 流式写入文件
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            for subdomain in subdomains:
                subdomain_count += 1
                subdomain_name = subdomain.name
                
                # 直接访问预加载的端口数据，避免N+1查询
                # 使用 .all() 访问已经预加载的关系数据
                ports_list = list(subdomain.ports.all())
                
                if not ports_list:
                    # 如果没有端口，使用默认协议端口组合
                    # HTTP 使用默认端口80，HTTPS 使用默认端口443
                    http_url = f"http://{subdomain_name}"
                    https_url = f"https://{subdomain_name}"
                    f.write(f"{http_url}\n")
                    f.write(f"{https_url}\n")
                    total_urls += 2
                else:
                    # 如果有端口，使用实际端口
                    for port in ports_list:
                        port_count += 1
                        port_num = port.number
                        
                        # 验证端口号有效性，避免无效端口
                        # 端口0在实际应用中是无效的，应该被排除
                        if port_num is None or port_num <= 0 or port_num > 65535:
                            logger.warning("子域名 %s 的端口号无效: %s，跳过", subdomain_name, port_num)
                            continue
                        
                        # 写入HTTP和HTTPS URL，标准端口不显示端口号
                        # HTTP协议：80端口为标准端口，不显示
                        if port_num == 80:
                            http_url = f"http://{subdomain_name}"
                        else:
                            http_url = f"http://{subdomain_name}:{port_num}"
                            
                        # HTTPS协议：443端口为标准端口，不显示
                        if port_num == 443:
                            https_url = f"https://{subdomain_name}"
                        else:
                            https_url = f"https://{subdomain_name}:{port_num}"
                        
                        f.write(f"{http_url}\n")
                        f.write(f"{https_url}\n")
                        total_urls += 2
                
                # 每处理1000个子域名打印一次进度
                if subdomain_count % 1000 == 0:
                    logger.info("已处理 %d 个子域名，生成 %d 个URL...", subdomain_count, total_urls)
        
        logger.info(
            "✓ 站点URL导出完成 - 子域名数: %d, 端口数: %d, 总URL数: %d, 文件: %s (%.2f KB)",
            subdomain_count,
            port_count,
            total_urls,
            output_file,
            output_path.stat().st_size / 1024
        )
        
        return {
            'success': True,
            'output_file': str(output_path),
            'total_urls': total_urls,
            'subdomain_count': subdomain_count,
            'port_count': port_count
        }
        
    except FileNotFoundError as e:
        logger.error("输出目录不存在: %s", e)
        raise
    except PermissionError as e:
        logger.error("文件写入权限不足: %s", e)
        raise
    except Exception as e:
        logger.exception("导出站点URL失败: %s", e)
        raise


@task(name="count_site_urls")
def count_site_urls_task(target_id: int) -> dict:
    """
    统计目标下可生成的站点URL数量
    
    Args:
        target_id: 目标ID
        
    Returns:
        dict: {
            'subdomain_count': int,
            'port_count': int,
            'estimated_urls': int  # 预估URL数量（每个端口生成HTTP和HTTPS两个URL）
        }
    """
    try:
        # 统计子域名数量
        subdomain_count = Subdomain.objects.filter(target_id=target_id).count()
        
        # 统计端口数量（通过子域名关联）
        port_count = Port.objects.filter(
            subdomain__target_id=target_id
        ).count()
        
        # 预估URL数量：
        # - 有端口的子域名：每个端口生成2个URL（HTTP+HTTPS）
        # - 没有端口的子域名：使用默认端口80,443，生成4个URL
        subdomains_with_ports = Subdomain.objects.filter(
            target_id=target_id,
            ports__isnull=False
        ).distinct().count()
        
        subdomains_without_ports = subdomain_count - subdomains_with_ports
        
        # 计算预估URL数量
        estimated_urls = (port_count * 2) + (subdomains_without_ports * 4)
        
        logger.info(
            "Target %d 的URL统计 - 子域名: %d, 端口: %d, 预估URL: %d",
            target_id, subdomain_count, port_count, estimated_urls
        )
        
        return {
            'subdomain_count': subdomain_count,
            'port_count': port_count,
            'estimated_urls': estimated_urls
        }
        
    except Exception as e:
        logger.exception("统计站点URL数量失败: %s", e)
        raise
