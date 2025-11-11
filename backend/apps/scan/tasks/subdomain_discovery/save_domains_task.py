"""
保存域名任务

负责将验证后的域名批量保存到数据库
"""

import logging
import time
from pathlib import Path
from prefect import task
from typing import List
from django.db import IntegrityError, OperationalError, DatabaseError

from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.subdomain_repository import SubdomainDTO

logger = logging.getLogger(__name__)


@task(
    name='save_domains',
    retries=0,
    log_prints=True
)
def save_domains_task(
    domains_file: str,
    scan_id: int,
    target_id: int = None,
    batch_size: int = 1000
) -> int:
    """
    流式批量保存域名到数据库
    
    Args:
        domains_file: 域名文件路径（流式读取）
        scan_id: 扫描任务 ID
        target_id: 目标 ID（可选）
        batch_size: 批量保存大小
    
    Returns:
        int: 成功保存的域名数量
    
    Raises:
        ValueError: 参数验证失败（target_id为None或路径不是文件）
        FileNotFoundError: 域名文件不存在
        RuntimeError: 数据库操作失败
        IOError: 文件读取失败
    
    Performance:
        - 流式读取文件，边读边保存
        - 内存占用恒定（只存储一个 batch）
        - 默认batch_size=1000(平衡性能和内存)
        - 批次失败自动重试
    """
    logger.info("开始从文件流式保存域名到数据库: %s", domains_file)
    
    # 参数验证
    if target_id is None:
        raise ValueError("target_id 不能为 None，必须指定目标ID")
    
    # 文件验证
    file_path = Path(domains_file)
    if not file_path.exists():
        raise FileNotFoundError(f"域名文件不存在: {domains_file}")
    if not file_path.is_file():
        raise ValueError(f"路径不是文件: {domains_file}")
    
    saved_count = 0
    batch_num = 0
    failed_batches = []  # 记录失败的批次
    total_domains = 0  # 总域名数
    
    try:
        # 流式读取并分批保存
        batch = []
        
        with open(domains_file, 'r', encoding='utf-8') as f:
            for line in f:
                domain = line.strip()
                if not domain:
                    continue
                
                batch.append(domain)
                total_domains += 1
                
                # 达到批次大小，执行保存
                if len(batch) >= batch_size:
                    batch_num += 1
                    result = _save_batch_with_retry(batch, scan_id, target_id, batch_num)
                    if result['success']:
                        saved_count += result['count']
                    else:
                        failed_batches.append(batch_num)
                        logger.warning("批次 %d 保存失败，已记录", batch_num)
                    
                    batch = []  # 清空批次
                    
                    # 每20个批次输出进度(减少日志开销)
                    if batch_num % 20 == 0:
                        logger.info("进度: 已处理 %d 批次，成功保存 %d 个域名", batch_num, saved_count)
            
            # 保存最后一批（可能不足 batch_size）
            if batch:
                batch_num += 1
                result = _save_batch_with_retry(batch, scan_id, target_id, batch_num)
                if result['success']:
                    saved_count += result['count']
                else:
                    failed_batches.append(batch_num)
        
        # 输出最终统计
        if failed_batches:
            logger.warning(
                "⚠ 保存完成（部分失败）- 总计: %d 个域名，成功: %d，失败批次: %s",
                total_domains, saved_count, failed_batches
            )
        else:
            logger.info("✓ 保存完成 - 成功保存 %d 个域名（%d 批次）", saved_count, batch_num)
        
        return saved_count
        
    except (IntegrityError, OperationalError, DatabaseError) as e:
        error_msg = f"数据库操作失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except IOError as e:
        error_msg = f"文件读取失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except Exception as e:
        error_msg = f"保存域名失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise


def _save_batch_with_retry(batch: List[str], scan_id: int, target_id: int, batch_num: int, max_retries: int = 3) -> dict:
    """
    保存一个批次的域名（带重试机制）
    
    Args:
        batch: 域名批次
        scan_id: 扫描ID
        target_id: 目标ID
        batch_num: 批次编号
        max_retries: 最大重试次数
    
    Returns:
        dict: {'success': bool, 'count': int}
    
    Strategy:
        使用 upsert_many 确保数据一致性
        - 新域名：插入 (INSERT)
        - 重复域名：更新关联 (UPDATE scan_id, target_id)
        - 保证每次扫描的域名都正确关联到当前扫描
    """
    repository = DjangoSubdomainRepository()
    items = [
        SubdomainDTO(
            name=domain,
            scan_id=scan_id,
            target_id=target_id
        )
        for domain in batch
    ]
    
    for attempt in range(max_retries):
        try:
            # 直接使用 upsert_many（确保重复域名也会更新）
            # 虽然比 bulk_create 慢，但保证数据一致性
            created_count = repository.upsert_many(items)
            logger.debug("批次 %d: 已保存/更新 %d/%d 个域名", 
                       batch_num, created_count, len(batch))
            return {'success': True, 'count': created_count}
        
        except (OperationalError, DatabaseError) as e:
            # 数据库连接/操作错误，可重试
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 指数退避: 1s, 2s, 4s
                logger.warning("批次 %d 保存失败（第 %d 次尝试），%d秒后重试: %s", 
                             batch_num, attempt + 1, wait_time, str(e)[:100])
                time.sleep(wait_time)
            else:
                logger.error("批次 %d 保存失败（已重试 %d 次）: %s", batch_num, max_retries, e)
                return {'success': False, 'count': 0}
        
        except IntegrityError as e:
            # 数据完整性错误，不应重试
            logger.error("批次 %d 数据完整性错误，跳过: %s", batch_num, str(e)[:100])
            return {'success': False, 'count': 0}
        
        except Exception as e:
            # 其他未知错误
            logger.error("批次 %d 未知错误: %s", batch_num, e, exc_info=True)
            return {'success': False, 'count': 0}
    
    return {'success': False, 'count': 0}
