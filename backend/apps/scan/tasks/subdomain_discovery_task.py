"""
子域名发现任务模块

使用 Celery 异步执行子域名扫描并保存结果到数据库

队列策略：
- 使用 scans 队列（重量级、限制并发）
- 特点：IO 密集型、中等耗时（1-10分钟）
- Worker 配置建议：中等并发（-c 10）
"""

import logging
import subprocess
import time
from typing import List

from celery import shared_task
from django.db import IntegrityError, OperationalError, DatabaseError
from validators import domain as validate_domain

from apps.scan.services.subdomain_discovery_service import SubdomainDiscoveryService
from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.subdomain_repository import SubdomainDTO

logger = logging.getLogger(__name__)


@shared_task(name='subdomain_discovery')
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
        ValueError: 参数验证失败时抛出
        
    信号触发：
        - 成功：正常 return → task_success 信号
        - 失败：抛出异常 → task_failure 信号
    """
    logger.info("开始子域名发现任务 - 目标: %s, 工作空间: %s", target, workspace_dir)
    
    try:
        # ========== 参数验证 ==========
        if not workspace_dir:
            raise ValueError("workspace_dir is required (must be provided by initiate_scan_task)")
        
        if not target or not isinstance(target, str):
            raise ValueError(f"Invalid target: {target}")
        
        # ========== 执行子域名发现 ==========
        service = SubdomainDiscoveryService()
        result_file = service.discover(target, base_dir=workspace_dir)
        
        if not result_file:
            raise RuntimeError(f"子域名发现失败 - 目标: {target}, 未生成结果文件")
        
        logger.debug("子域名发现完成 - 结果文件: %s", result_file)
        
        # ========== 解析并保存子域名到数据库 ==========
        subdomains = service.get_scan_results(result_file)
        
        if not subdomains:
            raise RuntimeError(f"无法读取扫描结果或结果为空 - 目标: {target}, 文件: {result_file}")
        
        total_count = len(subdomains)
        logger.info("发现 %d 个子域名", total_count)
        
        # 验证域名并批量保存
        saved_count = _validate_and_save_subdomains(
            subdomains, 
            target,
            scan_id=scan_id, 
            target_id=target_id
        )
        
        logger.info("子域名扫描完成 - 发现 %d 个子域名", saved_count)
        
        # 注意：文件和目录清理由 CleanupHandler 通过 task_postrun 信号统一处理
        
        return {
            'total': saved_count,
            'target': target,
            'result_file': result_file
        }
    
    except ValueError as e:
        # 参数验证错误
        error_msg = f"参数验证失败 - 目标: {target}: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except (OSError, IOError) as e:
        # 文件系统错误
        error_msg = f"文件系统错误 - 目标: {target}, {type(e).__name__}: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except subprocess.SubprocessError as e:
        # 扫描工具执行失败
        error_msg = f"扫描工具执行失败 - 目标: {target}, {type(e).__name__}: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except (IntegrityError, OperationalError, DatabaseError) as e:
        # 数据库错误
        error_msg = f"数据库操作失败 - 目标: {target}, {type(e).__name__}: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except Exception as e:
        # 未预期的错误
        error_msg = f"任务执行失败 - 目标: {target}, {type(e).__name__}: {e}"
        logger.error(error_msg, exc_info=True)
        raise


def _validate_and_save_subdomains(
    subdomains: List[str],
    target: str,
    scan_id: int = None,
    target_id: int = None,
    batch_size: int = 1000,
    max_retries: int = 3
) -> int:
    """
    验证域名并批量保存到数据库
    
    Args:
        subdomains: 子域名列表
        target: 目标域名（用于错误日志）
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_size: 批量插入的大小
        max_retries: 数据库操作最大重试次数
    
    Returns:
        saved_count: 成功保存的子域名数量
        
    Raises:
        RuntimeError: 验证或保存失败时抛出
    """
    valid_subdomains = []
    
    # 步骤 1: 验证域名
    logger.debug("开始验证 %d 个子域名", len(subdomains))
    
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
                logger.debug("无效子域名: %s", subdomain)
        except (ValueError, TypeError) as e:
            logger.debug("验证子域名失败 %s: %s", subdomain, e)
            continue
    
    valid_count = len(valid_subdomains)
    logger.debug("验证完成: %d/%d 个子域名有效", valid_count, len(subdomains))
    
    if not valid_subdomains:
        error_msg = f"没有有效的子域名可保存 - 目标: {target}"
        logger.warning(error_msg)
        raise RuntimeError(error_msg)
    
    # 步骤 2: 通过仓储批量保存到数据库
    repository = DjangoSubdomainRepository()
    saved_count = 0
    total_batches = (len(valid_subdomains) + batch_size - 1) // batch_size

    logger.debug("开始保存到数据库: %d 批次, 每批 %d 条", total_batches, batch_size)

    # 分批转换 DTO 并保存
    for i in range(0, len(valid_subdomains), batch_size):
        batch = valid_subdomains[i:i + batch_size]
        batch_num = i // batch_size + 1
        items = [
            SubdomainDTO(name=sub, scan_id=scan_id, target_id=target_id)
            for sub in batch
        ]
        
        # 添加重试逻辑处理数据库临时错误
        for retry in range(max_retries):
            try:
                created_count = repository.upsert_many(items)
                saved_count += created_count
                logger.debug("批次 %d/%d: 已保存 %d 个子域名", batch_num, total_batches, created_count)
                break  # 成功则退出重试循环
            
            except IntegrityError as e:
                # 数据完整性错误（如违反唯一约束）通常不可恢复
                error_msg = f"数据完整性错误 - 批次 {batch_num}/{total_batches}: {e}"
                logger.error(error_msg)
                raise RuntimeError(error_msg) from e
            
            except OperationalError as e:
                # 数据库操作错误（如连接问题、锁等待超时）可能是临时的，可以重试
                if retry < max_retries - 1:
                    wait_time = 2 ** retry  # 指数退避: 1s, 2s, 4s
                    logger.warning(
                        "数据库操作失败，%d 秒后重试 (%d/%d) - 批次 %d/%d: %s",
                        wait_time, retry + 1, max_retries, batch_num, total_batches, e
                    )
                    time.sleep(wait_time)
                    continue
                else:
                    error_msg = f"数据库操作失败（已达最大重试次数）- 批次 {batch_num}/{total_batches}: {e}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg) from e
            
            except DatabaseError as e:
                # 其他数据库错误
                error_msg = f"数据库错误 - 批次 {batch_num}/{total_batches}: {type(e).__name__}: {e}"
                logger.error(error_msg)
                raise RuntimeError(error_msg) from e

    logger.debug("成功保存 %d/%d 个子域名到数据库", saved_count, valid_count)
    return saved_count



# ==================== 导出接口 ====================

__all__ = ['subdomain_discovery_task']
