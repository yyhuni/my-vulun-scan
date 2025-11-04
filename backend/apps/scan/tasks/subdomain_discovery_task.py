"""
子域名发现任务模块

使用 Celery 异步执行子域名扫描并保存结果到数据库
"""

import logging
from typing import List

from celery import shared_task
from validators import domain as validate_domain

from apps.scan.services.subdomain_discovery_service import SubdomainDiscoveryService
from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.subdomain_repository import SubdomainDTO

logger = logging.getLogger(__name__)


@shared_task(name='subdomain_discovery', queue='scans')
def subdomain_discovery_task(target: str, scan_id: int = None, target_id: int = None, workspace_dir: str = None) -> dict:
    """
    子域名发现任务
    
    Args:
        target: 目标域名
        scan_id: 扫描任务 ID（必填）
        target_id: 目标 ID（可选）
        workspace_dir: 扫描工作空间目录路径（必填）
                      - 由 initiate_scan_task 创建并传递
                      - 将在此目录下创建 subdomain_discovery/ 模块目录
    
    Returns:
        {
            'total': int,  # 成功保存的子域名数量
            'target': str,
            'result_file': str
        }
    
    Raises:
        RuntimeError: 扫描失败或保存失败时抛出
        
    信号触发：
        - 成功：正常 return → task_success 信号
        - 失败：抛出异常 → task_failure 信号
    """
    logger.info("开始子域名发现任务 - 目标: %s, 工作空间: %s", target, workspace_dir)
    
    # 参数验证
    if not workspace_dir:
        error_msg = "workspace_dir is required (must be provided by initiate_scan_task)"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    # ========== 执行子域名发现 ==========
    # 创建服务实例并执行扫描
    service = SubdomainDiscoveryService()
    result_file = service.discover(target, base_dir=workspace_dir)
    
    if not result_file:
        error_msg = f"子域名发现失败 - 目标: {target}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)  # ← 抛出异常，触发 task_failure
    
    logger.info("子域名发现完成 - 结果文件: %s", result_file)
    
    # ========== 解析并保存子域名到数据库 ==========
    # 读取扫描结果
    subdomains = service.get_scan_results(result_file)
    total_count = len(subdomains)
    logger.info("发现 %d 个子域名", total_count)
    
    # 验证域名并批量保存
    # 如果保存失败，会抛出异常，触发 task_failure
    saved_count = _validate_and_save_subdomains(
        subdomains, 
        target,
        scan_id=scan_id, 
        target_id=target_id
    )
    
    logger.info("✓ 任务成功完成 - 已保存 %d 个子域名", saved_count)
    
    # 注意：文件和目录清理由 CleanupHandler 通过 task_postrun 信号统一处理
    
    # 只有执行到这里才会触发 task_success
    return {
        'total': saved_count,
        'target': target,
        'result_file': result_file
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
        _target: 目标域名（未使用，保留用于日志）
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_size: 批量插入的大小
    
    Returns:
        saved_count: 成功保存的子域名数量
        
    Raises:
        RuntimeError: 保存失败时抛出
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
        error_msg = "没有有效的子域名可保存"
        logger.warning(error_msg)
        raise RuntimeError(error_msg)
    
    # 步骤 2: 通过仓储批量保存到数据库
    repository = DjangoSubdomainRepository()
    saved_count = 0

    # 分批转换 DTO 并保存（如果失败会抛出异常）
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
    return saved_count



# ==================== 导出接口 ====================

__all__ = ['subdomain_discovery_task']
