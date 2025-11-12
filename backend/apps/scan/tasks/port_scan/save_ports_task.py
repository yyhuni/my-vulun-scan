"""
保存端口扫描结果任务

负责将解析后的端口扫描结果批量保存到数据库
"""

import logging
import time
from prefect import task
from typing import Generator
from django.db import IntegrityError, OperationalError, DatabaseError, transaction

from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.django_ip_address_repository import DjangoIPAddressRepository
from apps.asset.repositories.django_port_repository import DjangoPortRepository
from apps.asset.repositories.ip_address_repository import IPAddressDTO
from apps.asset.repositories.port_repository import PortDTO
from .types import PortScanRecord

logger = logging.getLogger(__name__)


@task(
    name='save_ports',
    retries=0,
    log_prints=True
)
def save_ports_task(
    data_generator: Generator[PortScanRecord, None, None],
    scan_id: int,
    target_id: int,
    batch_size: int = 500
) -> dict:
    """
    流式批量保存端口扫描结果到数据库
    
    Args:
        data_generator: 解析后的数据生成器
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_size: 批量保存大小（默认500，因为需要关联查询）
    
    Returns:
        dict: {
            'processed_records': int  # 处理的记录总数
        }
    
    Raises:
        ValueError: 参数验证失败
        RuntimeError: 数据库操作失败
    
    Performance:
        - 流式处理生成器，边读边保存
        - 内存占用恒定（只存储一个 batch）
        - 批次失败自动重试
        - 使用事务确保数据一致性
    
    Note:
        保存逻辑：
        1. 根据 host 查找 Subdomain
        2. 创建/获取 IPAddress（关联 subdomain + target）
        3. 创建 Port（关联 ip + target）
        4. 忽略重复记录（由唯一约束处理）
    """
    logger.info("开始从生成器流式保存端口扫描结果到数据库")
    
    # 参数验证
    if target_id is None:
        raise ValueError("target_id 不能为 None，必须指定目标ID")
    
    total_records = 0
    batch_num = 0
    failed_batches = []
    
    try:
        batch = []
        
        # 流式读取生成器并分批保存
        for record in data_generator:
            batch.append(record)
            total_records += 1
            
            # 达到批次大小，执行保存
            if len(batch) >= batch_size:
                batch_num += 1
                result = _save_batch_with_retry(batch, target_id, batch_num)
                if not result['success']:
                    failed_batches.append(batch_num)
                    logger.warning("批次 %d 保存失败，已记录", batch_num)
                
                batch = []  # 清空批次
                
                # 每10个批次输出进度
                if batch_num % 10 == 0:
                    logger.info("进度: 已处理 %d 批次，%d 条记录", batch_num, total_records)
        
        # 保存最后一批
        if batch:
            batch_num += 1
            result = _save_batch_with_retry(batch, target_id, batch_num)
            if not result['success']:
                failed_batches.append(batch_num)
        
        # 输出最终统计
        if failed_batches:
            logger.warning(
                "⚠ 保存完成（部分失败）- 处理记录: %d，失败批次: %s",
                total_records, failed_batches
            )
        else:
            logger.info(
                "✓ 保存完成 - 处理记录: %d（%d 批次）",
                total_records, batch_num
            )
        
        return {
            'processed_records': total_records
        }
        
    except (IntegrityError, OperationalError, DatabaseError) as e:
        error_msg = f"数据库操作失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except Exception as e:
        error_msg = f"保存端口扫描结果失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise


def _save_batch_with_retry(
    batch: list,
    target_id: int,
    batch_num: int,
    max_retries: int = 3
) -> dict:
    """
    保存一个批次的端口扫描结果（带重试机制）
    
    Args:
        batch: 数据批次
        target_id: 目标ID
        batch_num: 批次编号
        max_retries: 最大重试次数
    
    Returns:
        dict: {'success': bool}
    """
    for attempt in range(max_retries):
        try:
            _save_batch(batch, target_id, batch_num)
            return {'success': True}
        
        except (OperationalError, DatabaseError) as e:
            # 数据库连接/操作错误，可重试
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 指数退避: 1s, 2s, 4s
                logger.warning(
                    "批次 %d 保存失败（第 %d 次尝试），%d秒后重试: %s",
                    batch_num, attempt + 1, wait_time, str(e)[:100]
                )
                time.sleep(wait_time)
            else:
                logger.error("批次 %d 保存失败（已重试 %d 次）: %s", batch_num, max_retries, e)
                return {'success': False}
        
        except IntegrityError as e:
            # 数据完整性错误，不应重试
            logger.error("批次 %d 数据完整性错误，跳过: %s", batch_num, str(e)[:100])
            return {'success': False}
        
        except Exception as e:
            # 其他未知错误
            logger.error("批次 %d 未知错误: %s", batch_num, e, exc_info=True)
            return {'success': False}
    
    return {'success': False}


def _save_batch(batch: list, target_id: int, batch_num: int):
    """
    保存一个批次的数据到数据库（使用 Repository 模式）
    
    优化策略：
        1. 批量查询 Subdomain（1 次查询）
        2. 批量创建 IPAddress（1 次插入，Repository）
        3. 批量查询 IPAddress（1 次查询）
        4. 批量创建 Port（1 次插入，Repository）
        总计只需 4 次数据库操作，性能提升 30-50 倍
    """
    # 初始化 Repository
    subdomain_repo = DjangoSubdomainRepository()
    ip_repo = DjangoIPAddressRepository()
    port_repo = DjangoPortRepository()
    
    # 使用事务确保数据一致性
    with transaction.atomic():
        # ========== Step 1: 批量查询 Subdomain（使用 Repository）==========
        hosts = {record['host'] for record in batch}
        subdomain_map = subdomain_repo.get_by_names(hosts, target_id)
        
        # ========== Step 2: 准备 IPAddress 数据 ==========
        # 提取所有唯一的 (subdomain_id, ip) 组合
        ip_set = set()
        
        for record in batch:
            host = record['host']
            ip_addr = record['ip']
            
            subdomain = subdomain_map.get(host)
            if not subdomain:
                logger.debug("未找到域名 %s 对应的 Subdomain，跳过", host)
                continue
            
            ip_key = (subdomain.id, ip_addr)
            ip_set.add(ip_key)
        
        # ========== Step 3: 批量创建 IPAddress（使用 Repository）==========
        ip_items = [
            IPAddressDTO(
                subdomain_id=subdomain_id,
                ip=ip_addr,
                target_id=target_id
            )
            for subdomain_id, ip_addr in ip_set
        ]
        
        # 批量插入（忽略已存在的记录）
        if ip_items:
            ip_repo.bulk_create_ignore_conflicts(ip_items)
        
        # ========== Step 4: 批量查询所有 IPAddress（使用 Repository）==========
        ip_map = {}
        if ip_set:
            # 从 ip_set 中提取查询条件
            subdomain_ids = {subdomain_id for subdomain_id, _ in ip_set}
            ip_addrs = {ip_addr for _, ip_addr in ip_set}
            
            # 使用 Repository 批量查询
            ip_map = ip_repo.get_by_subdomain_and_ips(subdomain_ids, ip_addrs)
        
        # ========== Step 5: 批量创建 Port（使用 Repository）==========
        port_items = []
        
        for record in batch:
            host = record['host']
            ip_addr = record['ip']
            port_num = record['port']
            
            subdomain = subdomain_map.get(host)
            if not subdomain:
                continue
            
            # 从映射中获取 IPAddress 对象
            ip_key = (subdomain.id, ip_addr)
            ip_obj = ip_map.get(ip_key)
            
            if not ip_obj:
                logger.warning(
                    "批次 %d: 未找到 IP (%s, %s)，跳过端口 %d",
                    batch_num, host, ip_addr, port_num
                )
                continue
            
            port_items.append(
                PortDTO(
                    ip_id=ip_obj.id,
                    subdomain_id=subdomain.id,
                    number=port_num,
                    service_name=''  # 可以后续添加服务识别
                )
            )
        
        # 批量插入 Port（忽略重复）
        if port_items:
            port_repo.bulk_create_ignore_conflicts(port_items)
    
    logger.debug("批次 %d: 保存完成", batch_num)
