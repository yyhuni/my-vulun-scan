"""
解析并保存端口扫描结果任务（合并版本）

主要功能：
    1. 解析 naabu 端口扫描结果文件（JSONL 格式）
    2. 保存端口信息（Port）- 核心资产
    3. 保存 IP 地址信息（IPAddress）- 附带资产
    4. 建立数据关联：Subdomain → IPAddress → Port

数据流向：
    扫描结果文件 → 解析生成器 → 批量处理 → 数据库
    
    输入：扫描结果文件列表
    输出：Port 和 IPAddress 记录

优化策略：
    - 流式处理避免内存溢出
    - 批量操作减少数据库交互（500条/批次）
    - 使用 Repository 模式统一数据访问
    - 优化事务粒度（短事务）+ 重试机制保证最终一致性
    - 避免 Prefect 任务间传递生成器的序列化问题
"""

import logging
import time
import sys
import json
from pathlib import Path
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

MAX_SUBDOMAIN_CACHE_BYTES = 100 * 1024 * 1024

def _approx_size_bytes(obj) -> int:
    try:
        return sys.getsizeof(obj)
    except Exception:
        return 0

def _estimate_subdomain_cache_size(cache: dict) -> int:
    size = _approx_size_bytes(cache)
    for k, v in cache.items():
        size += _approx_size_bytes(k)
        # 仅估算关键字段，避免对 ORM 实例做深度遍历
        if v is None:
            continue
        size += _approx_size_bytes(getattr(v, 'id', None))
        size += _approx_size_bytes(getattr(v, 'name', None))
        size += _approx_size_bytes(getattr(v, 'subdomain', None))
        if not getattr(v, 'id', None) and not getattr(v, 'name', None):
            size += _approx_size_bytes(str(v))
    return size

def _maybe_trim_subdomain_cache(cache: dict) -> bool:
    try:
        if _estimate_subdomain_cache_size(cache) > MAX_SUBDOMAIN_CACHE_BYTES:
            cache.clear()
            return True
    except Exception:
        # 估算失败时不影响主流程
        return False
    return False

def _parse_naabu_results(result_files: list) -> Generator[PortScanRecord, None, None]:
    """
    解析 naabu 扫描结果文件（JSONL 格式）
    
    使用生成器实现懒加载，边解析边 yield，不会一次性加载所有数据到内存
    
    Args:
        result_files: naabu 结果文件路径列表
    
    Yields:
        dict: 每次 yield 一条解析后的数据，格式：
        {
            'host': str,          # 域名
            'ip': str,            # IP地址
            'port': int,          # 端口号
        }
    """
    logger.info("开始解析 naabu 扫描结果（生成器模式）- 文件数量: %d", len(result_files))
    
    total_lines = 0
    error_lines = 0
    valid_records = 0
    
    for result_file in result_files:
        file_path = Path(result_file)
        
        if not file_path.exists():
            logger.warning("结果文件不存在，跳过: %s", result_file)
            continue
        
        if file_path.stat().st_size == 0:
            logger.warning("结果文件为空，跳过: %s", result_file)
            continue
        
        logger.info("解析文件: %s (%.2f KB)", file_path.name, file_path.stat().st_size / 1024)
        
        # 流式读取文件，逐行解析
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                total_lines += 1
                
                # 跳过空行
                line = line.strip()
                if not line:
                    continue
                
                try:
                    # 解析 JSON
                    data = json.loads(line)
                    
                    # 提取必要字段
                    host = data.get('host', '').strip()
                    ip = data.get('ip', '').strip()
                    port = data.get('port')
                    
                    # 验证必要字段
                    if not host or not ip or port is None:
                        logger.warning(
                            "文件 %s 行 %d 缺少必要字段，跳过: %s",
                            file_path.name, line_num, line[:100]
                        )
                        error_lines += 1
                        continue
                    
                    # 确保端口是整数
                    try:
                        port = int(port)
                        if port < 1 or port > 65535:
                            logger.warning(
                                "文件 %s 行 %d 端口号无效 (%d)，跳过",
                                file_path.name, line_num, port
                            )
                            error_lines += 1
                            continue
                    except (ValueError, TypeError):
                        logger.warning(
                            "文件 %s 行 %d 端口号格式错误，跳过: %s",
                            file_path.name, line_num, port
                        )
                        error_lines += 1
                        continue
                    
                    # yield 一条记录（懒加载，不占用内存）
                    valid_records += 1
                    yield {
                        'host': host,
                        'ip': ip,
                        'port': port,
                    }
                    
                except json.JSONDecodeError as e:
                    logger.warning(
                        "文件 %s 行 %d JSON 解析失败: %s - 内容: %s",
                        file_path.name, line_num, e, line[:100]
                    )
                    error_lines += 1
                    continue
                
                except Exception as e:
                    logger.warning(
                        "文件 %s 行 %d 解析异常: %s - 内容: %s",
                        file_path.name, line_num, e, line[:100]
                    )
                    error_lines += 1
                    continue
    
    logger.info("解析完成 - 总行数: %d, 错误行数: %d, 有效记录: %d", total_lines, error_lines, valid_records)

@task(
    name='parse_and_save_ports',
    retries=0,
    log_prints=True
)
def parse_and_save_ports_task(
    result_files: list,
    scan_id: int,
    target_id: int,
    batch_size: int = 500
) -> dict:
    """
    解析并流式批量保存端口扫描结果到数据库
    
    保存内容：
        - Port（主要资产）：开放的端口
        - IPAddress（附带资产）：域名对应的 IP 地址
        - 建立关联：Port → IPAddress → Subdomain → Target
    
    Args:
        result_files: 扫描结果文件列表
        scan_id: 扫描任务 ID（暂未使用，预留）
        target_id: 目标 ID
        batch_size: 批量保存大小（默认500，因为需要关联查询）
    
    Returns:
        dict: {
            'processed_records': int,  # 处理的记录总数
            'created_ips': int,        # 创建的IP记录数
            'created_ports': int,      # 创建的端口记录数
            'skipped_no_subdomain': int,  # 因域名不存在跳过的记录数
            'skipped_no_ip': int,      # 因IP不存在跳过的记录数
        }
    
    Raises:
        ValueError: 参数验证失败
        RuntimeError: 数据库操作失败
    
    Performance:
        - 流式处理生成器，边读边保存
        - 内存占用恒定（只存储一个 batch）
        - 批次失败自动重试（最多3次，指数退避）
        - 使用事务确保数据一致性
    
    保存逻辑（每批次4次数据库操作）：
        1. 批量查询 Subdomain（根据域名）
        2. 批量创建 IPAddress（subdomain_id + ip + target_id）
        3. 批量查询 IPAddress（获取刚创建的记录）
        4. 批量创建 Port（ip_id + subdomain_id + port）
    
    数据校验：
        - 只处理数据库中已存在的域名
        - 忽略重复的 IP 和端口（unique constraints）
        - 跳过无法关联的记录并记录警告
    """
    logger.info("开始解析并保存端口扫描结果 - target_id=%s, 文件数量=%d", target_id, len(result_files))
    
    # 参数验证
    if target_id is None:
        raise ValueError("target_id 不能为 None，必须指定目标ID")
    
    # 创建内部生成器（避免 Prefect 序列化问题）
    data_generator = _parse_naabu_results(result_files)
    
    total_records = 0
    batch_num = 0
    failed_batches = []
    subdomain_cache = {}
    
    # 统计信息
    total_created_ips = 0
    total_created_ports = 0
    total_skipped_no_subdomain = 0
    total_skipped_no_ip = 0
    
    try:
        batch = []
        
        # 流式读取生成器并分批保存
        record_count = 0
        for record in data_generator:
            record_count += 1
            
            if record_count % 1000 == 0:  # 每1000条记录输出一次进度
                logger.info("已读取 %d 条记录", record_count)
            
            batch.append(record)
            total_records += 1
            
            # 达到批次大小，执行保存
            if len(batch) >= batch_size:
                batch_num += 1
                result = _save_batch_with_retry(batch, scan_id, target_id, batch_num, subdomain_cache)
                if not result['success']:
                    failed_batches.append(batch_num)
                    logger.warning("批次 %d 保存失败，已记录", batch_num)
                else:
                    # 累计统计信息
                    total_created_ips += result.get('created_ips', 0)
                    total_created_ports += result.get('created_ports', 0)
                    total_skipped_no_subdomain += result.get('skipped_no_subdomain', 0)
                    total_skipped_no_ip += result.get('skipped_no_ip', 0)
                
                batch = []  # 清空批次
                
                # 每20个批次输出进度
                if batch_num % 20 == 0:
                    logger.info("进度: 已处理 %d 批次，%d 条记录", batch_num, total_records)
        
        
        # 保存最后一批
        if batch:
            batch_num += 1
            result = _save_batch_with_retry(batch, scan_id, target_id, batch_num, subdomain_cache)
            if not result['success']:
                failed_batches.append(batch_num)
            else:
                # 累计统计信息
                total_created_ips += result.get('created_ips', 0)
                total_created_ports += result.get('created_ports', 0)
                total_skipped_no_subdomain += result.get('skipped_no_subdomain', 0)
                total_skipped_no_ip += result.get('skipped_no_ip', 0)
        
        # 输出最终统计
        if failed_batches:
            error_msg = (
                f"保存端口扫描结果时出现失败批次，处理记录: {total_records}，"
                f"失败批次: {failed_batches}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        logger.info(
            "✓ 保存完成 - 处理记录: %d（%d 批次），创建IP: %d，创建端口: %d，跳过（无域名）: %d，跳过（无IP）: %d",
            total_records, batch_num, total_created_ips, total_created_ports, 
            total_skipped_no_subdomain, total_skipped_no_ip
        )
        
        # 如果没有创建任何记录，给出明确提示
        if total_created_ips == 0 and total_created_ports == 0:
            logger.warning(
                "⚠️  没有创建任何记录！可能原因：1) 域名不在数据库中 2) 数据格式问题 3) 重复数据被忽略"
            )
        
        return {
            'processed_records': total_records,
            'created_ips': total_created_ips,
            'created_ports': total_created_ports,
            'skipped_no_subdomain': total_skipped_no_subdomain,
            'skipped_no_ip': total_skipped_no_ip
        }
        
    except (IntegrityError, OperationalError, DatabaseError) as e:
        error_msg = f"数据库操作失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except Exception as e:
        error_msg = f"解析并保存端口扫描结果失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise


def _save_batch_with_retry(
    batch: list,
    scan_id: int,
    target_id: int,
    batch_num: int,
    subdomain_cache: dict,
    max_retries: int = 3
) -> dict:
    """
    保存一个批次的端口扫描结果（带重试机制）
    
    Args:
        batch: 数据批次
        scan_id: 扫描任务ID
        target_id: 目标ID
        batch_num: 批次编号
        max_retries: 最大重试次数
    
    Returns:
        dict: {
            'success': bool,
            'created_ips': int,
            'created_ports': int, 
            'skipped_no_subdomain': int,
            'skipped_no_ip': int
        }
    """
    for attempt in range(max_retries):
        try:
            stats = _save_batch(batch, scan_id, target_id, batch_num, subdomain_cache)
            return {
                'success': True,
                'created_ips': stats.get('created_ips', 0),
                'created_ports': stats.get('created_ports', 0),
                'skipped_no_subdomain': stats.get('skipped_no_subdomain', 0),
                'skipped_no_ip': stats.get('skipped_no_ip', 0)
            }
        
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
                return {
                    'success': False,
                    'created_ips': 0,
                    'created_ports': 0,
                    'skipped_no_subdomain': 0,
                    'skipped_no_ip': 0
                }
        
        except IntegrityError as e:
            # 数据完整性错误，不应重试
            logger.error("批次 %d 数据完整性错误，跳过: %s", batch_num, str(e)[:100])
            return {
                'success': False,
                'created_ips': 0,
                'created_ports': 0,
                'skipped_no_subdomain': 0,
                'skipped_no_ip': 0
            }
        
        except Exception as e:
            # 其他未知错误
            logger.error("批次 %d 未知错误: %s", batch_num, e, exc_info=True)
            return {
                'success': False,
                'created_ips': 0,
                'created_ports': 0,
                'skipped_no_subdomain': 0,
                'skipped_no_ip': 0
            }
    
    return {
        'success': False,
        'created_ips': 0,
        'created_ports': 0,
        'skipped_no_subdomain': 0,
        'skipped_no_ip': 0
    }


def _save_batch(batch: list, scan_id: int, target_id: int, batch_num: int, subdomain_cache: dict, max_retries: int = 3) -> dict:
    """
    保存一个批次的数据到数据库（使用 Repository 模式）
    
    数据关系链：
        Subdomain (已存在) → IPAddress (待创建/已存在) → Port (待创建)
    
    处理流程（4次数据库操作）：
        1. 查询 Subdomain：根据域名批量查询（Repository）
        2. 创建 IPAddress：批量插入 IP 记录，ignore_conflicts（Repository，独立短事务）
        3. 查询 IPAddress：获取刚创建的 IP 记录（Repository）
        4. 创建 Port：批量插入端口记录，ignore_conflicts（Repository，独立短事务）
    
    Args:
        batch: 数据批次，list of {'host', 'ip', 'port'}
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_num: 批次编号（用于日志）
        max_retries: 最大重试次数（默认3次）
    """
    # 初始化 Repository
    subdomain_repo = DjangoSubdomainRepository()
    ip_repo = DjangoIPAddressRepository()
    port_repo = DjangoPortRepository()
    
    # 统计变量
    skipped_no_subdomain = 0
    skipped_no_ip = 0
    
    # 重试机制：确保数据最终一致性
    for attempt in range(max_retries):
        try:
            # ========== Step 1: 批量查询 Subdomain（读操作，无需事务）==========
            hosts = {record['host'] for record in batch}
            uncached = hosts - set(subdomain_cache.keys())
            if uncached:
                new_data = subdomain_repo.get_by_names(uncached, target_id)
                subdomain_cache.update(new_data)
                if _maybe_trim_subdomain_cache(subdomain_cache):
                    logger.warning("Subdomain 缓存超过上限，已清空以避免 OOM")
            subdomain_map = {h: subdomain_cache[h] for h in hosts if h in subdomain_cache}
            
            # ========== Step 2: 准备 IPAddress 数据（内存操作，无需事务）==========
            # 提取所有唯一的 (subdomain_id, ip) 组合
            ip_set = set()
            
            for record in batch:
                host = record['host']
                ip_addr = record['ip']
                
                subdomain = subdomain_map.get(host)
                if not subdomain:
                    skipped_no_subdomain += 1
                    continue
                
                ip_key = (subdomain.id, ip_addr)
                ip_set.add(ip_key)
            
            # ========== Step 3: 批量创建 IPAddress（Repository 内部独立短事务）==========
            ip_items = [
                IPAddressDTO(
                    subdomain_id=subdomain_id,
                    ip=ip_addr,
                    target_id=target_id,
                    scan_id=scan_id
                )
                for subdomain_id, ip_addr in ip_set
            ]
            
            # 批量插入（忽略已存在的记录）
            if ip_items:
                ip_repo.bulk_create_ignore_conflicts(ip_items)
            
            # ========== Step 4: 批量查询所有 IPAddress（读操作，无需事务）==========
            ip_map = {}
            if ip_set:
                # 从 ip_set 中提取查询条件
                subdomain_ids = {subdomain_id for subdomain_id, _ in ip_set}
                ip_addrs = {ip_addr for _, ip_addr in ip_set}
                
                # 使用 Repository 批量查询
                ip_map = ip_repo.get_by_subdomain_and_ips(subdomain_ids, ip_addrs)
                
                # 验证查询结果的完整性
                expected_count = len(ip_set)
                actual_count = len(ip_map)
                if actual_count < expected_count:
                    logger.warning(
                        "批次 %d: IPAddress 查询结果不完整 - 预期 %d，实际 %d",
                        batch_num, expected_count, actual_count
                    )
                    
                    # 短暂延迟后重试查询（给数据库提交更多时间）
                    time.sleep(1)
                    ip_map_retry = ip_repo.get_by_subdomain_and_ips(subdomain_ids, ip_addrs)
                    
                    if len(ip_map_retry) > actual_count:
                        logger.info(
                            "批次 %d: 重试查询成功 - 找到 %d 条记录",
                            batch_num, len(ip_map_retry)
                        )
                        ip_map = ip_map_retry
                    else:
                        logger.debug(
                            "批次 %d: 重试查询无改善，可能是域名不存在或数据不一致",
                            batch_num
                        )
            
            # ========== Step 5: 批量创建 Port（Repository 内部独立短事务）==========
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
                    skipped_no_ip += 1
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
            
            # 🎉 成功完成，退出重试循环
            return {
                'created_ips': len(ip_items),
                'created_ports': len(port_items),
                'skipped_no_subdomain': skipped_no_subdomain,
                'skipped_no_ip': skipped_no_ip
            }
            
        except (OperationalError, DatabaseError) as e:
            # 数据库操作错误（连接断开、超时等）
            if attempt < max_retries - 1:
                # 还有重试机会
                logger.warning(
                    "批次 %d 保存失败（尝试 %d/%d）: %s，将在 1 秒后重试",
                    batch_num, attempt + 1, max_retries, str(e)
                )
                time.sleep(1)  # 短暂延迟后重试
            else:
                # 已达最大重试次数
                logger.error(
                    "批次 %d 保存失败，已达最大重试次数 %d: %s",
                    batch_num, max_retries, str(e)
                )
                raise
        
        except IntegrityError as e:
            # 数据完整性错误（通常不应该发生，因为有 ignore_conflicts）
            logger.error(
                "批次 %d 数据完整性错误: %s，不进行重试",
                batch_num, str(e)
            )
            raise
        
        except Exception as e:
            # 其他未预期的错误
            logger.error(
                "批次 %d 未知错误: %s (%s)，不进行重试",
                batch_num, str(e), type(e).__name__
            )
            raise
