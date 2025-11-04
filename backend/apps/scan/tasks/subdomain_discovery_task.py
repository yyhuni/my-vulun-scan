"""
子域名发现任务模块

使用 Celery 异步执行子域名扫描并保存结果到数据库
"""

import logging
from typing import List
from pathlib import Path

from celery import shared_task
from validators import domain as validate_domain

from apps.scan.services.subdomain_discovery import subdomain_discovery, get_scan_results
from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.subdomain_repository import SubdomainDTO

logger = logging.getLogger(__name__)


@shared_task(name='subdomain_discovery', queue='main_scan_queue')
def subdomain_discovery_task(target: str, scan_id: int = None, target_id: int = None, workspace_dir: str = None) -> dict:
    """
    子域名发现任务
    
    Args:
        target: 目标域名
        scan_id: 扫描任务 ID（可选）
        target_id: 目标 ID（可选）
        workspace_dir: 扫描工作空间目录路径（可选）
                      - 如果提供，将在此目录下创建 subdomain_discovery/ 模块目录
                      - 如果未提供，将创建独立的带时间戳目录
    
    Returns:
        {
            'success': bool,
            'total': int,
            'error': str
        }
    """
    logger.info("开始子域名发现任务 - 目标: %s, 工作空间: %s", target, workspace_dir or "独立模式")
    
    # ========== 执行子域名发现 ==========
    # 在工作空间下创建模块目录（或创建独立目录）
    result_file = subdomain_discovery(target, base_dir=workspace_dir)
    
    if not result_file:
        logger.error("子域名发现失败 - 目标: %s", target)
        return {
            'success': False,
            'total': 0,
            'error': '子域名发现失败'
        }
    
    logger.info("子域名发现完成 - 结果文件: %s", result_file)
    
    # ========== 解析并保存子域名到数据库 ==========
    try:
        # 读取扫描结果
        subdomains = get_scan_results(result_file)
        total_count = len(subdomains)
        logger.info("发现 %d 个子域名", total_count)
        
        # 验证域名并批量保存
        saved_count = _validate_and_save_subdomains(
            subdomains, 
            target,
            scan_id=scan_id, 
            target_id=target_id
        )
        
        logger.info("任务完成 - 已保存 %d 个子域名", saved_count)
        
        # 注意：文件和目录清理由 CleanupHandler 通过 task_postrun 信号统一处理
        
        return {
            'success': True,
            'total': saved_count,
            'error': None
        }
    
    except (OSError, ValueError, RuntimeError) as e:
        logger.exception("保存子域名到数据库失败")
        
        # 注意：资源清理由 CleanupHandler 通过 task_postrun 信号统一处理
        
        return {
            'success': False,
            'total': 0,
            'error': str(e)
        }


def _validate_and_save_subdomains(
    subdomains: List[str],
    _target: str,
    scan_id: int = None,
    target_id: int = None,
    batch_size: int = 1000
) -> int:
    """
    验证域名并批量保存到数据库
    
    Args:
        subdomains: 子域名列表
        target: 目标域名
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_size: 批量插入的大小
    
    Returns:
        saved_count: 成功保存的子域名数量
    """
    valid_subdomains = []
    
    # 步骤 1: 验证域名
    for subdomain in subdomains:
        subdomain = subdomain.strip()
        
        # 跳过空行
        if not subdomain:
            continue
        
        # 验证是否为有效域名
        try:
            if validate_domain(subdomain):
                valid_subdomains.append(subdomain)
            else:
                logger.debug("Invalid subdomain: %s", subdomain)
        except (ValueError, TypeError) as e:
            logger.debug("Failed to validate subdomain %s: %s", subdomain, e)
            continue
    
    valid_count = len(valid_subdomains)
    logger.info("Validated %d/%d subdomains", valid_count, len(subdomains))
    
    if not valid_subdomains:
        logger.warning("No valid subdomains to save")
        return 0
    
    # 步骤 2: 通过仓储批量保存到数据库
    repository = DjangoSubdomainRepository()
    saved_count = 0

    try:
        # 分批转换 DTO 并保存
        for i in range(0, len(valid_subdomains), batch_size):
            batch = valid_subdomains[i:i + batch_size]
            items = [
                SubdomainDTO(name=sub, scan_id=scan_id, target_id=target_id)
                for sub in batch
            ]
            created_count = repository.upsert_many(items)
            saved_count += created_count
            logger.debug("Batch %d: saved %d subdomains", i // batch_size + 1, created_count)

        logger.info("Successfully saved %d subdomains to database", saved_count)
    except Exception as e:
        logger.error("Failed to save subdomains via repository: %s", e)
        raise

    return saved_count



# ==================== 导出接口 ====================

__all__ = ['subdomain_discovery_task']
