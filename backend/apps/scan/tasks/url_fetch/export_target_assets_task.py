"""
导出目标资产任务

根据 input_type 导出不同类型的资产到文件：
- domains_file: 导出子域名列表（用于 waymore 等域名级工具）
- sites_file: 导出站点 URL 列表（用于 katana 等站点级工具）

使用流式写入，避免内存溢出

默认值模式：
- 如果没有资产，只写入默认值到文件，不写入数据库
- domains_file: 写入根域名 target_name
- sites_file: 写入 http://target_name 和 https://target_name
"""

import logging
from pathlib import Path
from prefect import task
from typing import Optional

logger = logging.getLogger(__name__)


@task(
    name='export_target_assets',
    retries=1,
    log_prints=True
)
def export_target_assets_task(
    output_file: str,
    target_id: int,
    scan_id: int,
    input_type: str,
    target_name: Optional[str] = None,
    batch_size: int = 1000
) -> dict:
    """
    根据 input_type 导出目标资产到文件
    
    默认值模式：
    - 如果没有资产，只写入默认值到文件，不写入数据库
    - 数据库只存储"真实发现"的资产
    
    Args:
        output_file: 输出文件路径
        target_id: 目标 ID
        scan_id: 扫描 ID
        input_type: 输入类型 ('domains_file' 或 'sites_file')
        target_name: 目标名称（用于懒加载时写入默认值）
        batch_size: 批次大小（内存优化）
        
    Returns:
        dict: {
            'output_file': str,  # 输出文件路径
            'asset_count': int,  # 资产数量
            'asset_type': str    # 资产类型（domains 或 sites）
        }
        
    Raises:
        ValueError: 参数错误
        RuntimeError: 执行失败
    """
    try:
        logger.info("开始导出目标资产 - 类型: %s", input_type)
        
        # 确保输出目录存在
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 根据 input_type 导出不同的资产
        if input_type == 'domains_file':
            # 导出子域名列表
            logger.info("从目标 %d 导出域名列表", target_id)
            from apps.asset.services import SubdomainService
            
            # 使用 Service 层的流式接口
            subdomain_service = SubdomainService()
            
            # 流式写入文件
            asset_count = 0
            with open(output_path, 'w') as f:
                # 使用 Service 层的迭代器进行批量处理
                for domain in subdomain_service.iter_subdomain_names_by_target(target_id, batch_size):
                    f.write(f"{domain}\n")
                    asset_count += 1
                    
                    # 每写入一批就刷新缓冲区
                    if asset_count % batch_size == 0:
                        f.flush()
            
            # ==================== 采用默认域名：如果没有 Subdomain，写入根域名 ====================
            if asset_count == 0 and target_name:
                logger.info("采用默认域名：没有子域名，写入根域名 %s 到文件（不写入数据库）", target_name)
                with open(output_path, 'w') as f:
                    f.write(f"{target_name}\n")
                asset_count = 1
            
            logger.info("✓ 域名导出完成 - 文件: %s, 数量: %d", output_file, asset_count)
            
            return {
                'output_file': output_file,
                'asset_count': asset_count,
                'asset_type': 'domains'
            }
            
        elif input_type == 'sites_file':
            # 导出站点 URL 列表（按目标导出）
            logger.info("从目标 %d 导出站点 URL 列表", target_id)
            from apps.asset.services import WebSiteService
            
            # 使用 Service 层的流式接口
            website_service = WebSiteService()
            
            # 流式写入文件
            asset_count = 0
            with open(output_path, 'w') as f:
                # 使用 Service 层的迭代器进行批量处理（按目标）
                for url in website_service.iter_website_urls_by_target(target_id, batch_size):
                    f.write(f"{url}\n")
                    asset_count += 1
                    
                    # 每写入一批就刷新缓冲区
                    if asset_count % batch_size == 0:
                        f.flush()
            
            # ==================== 采用默认 URL：如果没有 Website，写入默认 URL ====================
            if asset_count == 0 and target_name:
                logger.info("采用默认 URL：没有站点，写入 http(s)://%s 到文件（不写入数据库）", target_name)
                with open(output_path, 'w') as f:
                    f.write(f"http://{target_name}\n")
                    f.write(f"https://{target_name}\n")
                asset_count = 2
            
            logger.info("✓ 站点 URL 导出完成 - 文件: %s, 数量: %d", output_file, asset_count)
            
            return {
                'output_file': output_file,
                'asset_count': asset_count,
                'asset_type': 'sites'
            }
        
        else:
            # 未知的 input_type
            raise ValueError(f"不支持的 input_type: {input_type}，必须是 'domains_file' 或 'sites_file'")
        
    except Exception as e:
        logger.error("导出资产失败: %s", e, exc_info=True)
        raise RuntimeError(f"导出资产失败: {e}") from e
