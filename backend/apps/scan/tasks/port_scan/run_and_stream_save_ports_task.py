"""
基于 stream_command 的流式端口扫描任务

主要功能：
    1. 实时执行端口扫描命令（如 naabu）
    2. 流式处理命令输出，实时解析为 PortScanRecord
    3. 批量保存到数据库，复用现有的字段校验与统计逻辑
    4. 避免生成大量临时文件，提高效率

数据流向：
    命令执行 → 流式输出 → 实时解析 → 批量保存 → 数据库
    
    输入：扫描命令及参数
    输出：Port 和 IPAddress 记录

优化策略：
    - 使用 stream_command 实时处理输出
    - 复用现有的 _save_batch_with_retry 逻辑
    - 流式处理避免内存溢出
    - 批量操作减少数据库交互
"""

import logging
import json
import sys
import time
from pathlib import Path
from prefect import task
from typing import Generator, List, Optional
from django.db import IntegrityError, OperationalError, DatabaseError


from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.django_ip_address_repository import DjangoIPAddressRepository
from apps.asset.repositories.django_port_repository import DjangoPortRepository
from apps.asset.repositories.ip_address_repository import IPAddressDTO
from apps.asset.repositories.port_repository import PortDTO
from .types import PortScanRecord

from apps.scan.utils.stream_command import stream_command

logger = logging.getLogger(__name__)

MAX_SUBDOMAIN_CACHE_BYTES = 50 * 1024 * 1024 # 50 MB

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
    """
    检查并执行缓存淘汰（简单策略：超限时删除早期 50%）
    
    淘汰策略：
    - 如果超过内存上限，删除最早插入的 50%（基于 dict 插入顺序，Python 3.7+）
    
    Args:
        cache: dict 类型的缓存
    
    Returns:
        bool: 是否执行了淘汰
    """
    try:
        estimated_size = _estimate_subdomain_cache_size(cache)
        if estimated_size > MAX_SUBDOMAIN_CACHE_BYTES:
            # 删除最早插入的 50%
            items_to_remove = len(cache) // 2
            if items_to_remove > 0:
                keys_to_remove = list(cache.keys())[:items_to_remove]
                for key in keys_to_remove:
                    del cache[key]
                logger.warning(
                    "Subdomain 缓存内存超限 (%d MB > %d MB)，已淘汰 %d 条最早插入的记录",
                    estimated_size // 1024 // 1024, MAX_SUBDOMAIN_CACHE_BYTES // 1024 // 1024, items_to_remove
                )
                return True
    except Exception as e:
        # 估算失败时不影响主流程
        logger.warning("缓存淘汰检查失败: %s", e)
        return False
    return False


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
        
        except IntegrityError as e:
            # 数据完整性错误，不应重试（IntegrityError 是 DatabaseError 的子类，需先处理）
            logger.error("批次 %d 数据完整性错误，跳过: %s", batch_num, str(e)[:100])
            return {
                'success': False,
                'created_ips': 0,
                'created_ports': 0,
                'skipped_no_subdomain': 0,
                'skipped_no_ip': 0
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
            # 收集当前批次所有 host
            hosts = {record['host'] for record in batch}
            
            # 先从缓存命中
            cached_hosts = hosts & set(subdomain_cache.keys())
            
            # 对未命中的一次性批量查库（带重试机制）
            missing_hosts = hosts - cached_hosts
            if missing_hosts:
                # 对 Subdomain 查询添加独立的重试机制
                for query_attempt in range(3):  # 最多重试3次
                    try:
                        new_data = subdomain_repo.get_by_names_and_target_id(missing_hosts, target_id)
                        # 查到的写回缓存
                        subdomain_cache.update(new_data)
                        # 查不到的也标记为 None，避免重复查询
                        for host in missing_hosts:
                            if host not in subdomain_cache:
                                subdomain_cache[host] = None
                        break  # 查询成功，跳出重试循环
                        
                    except (OperationalError, DatabaseError) as e:
                        # 数据库操作错误（连接断开、超时等）- 可重试
                        logger.warning(
                            "批次 %d: Subdomain 查询失败（尝试 %d/3）: %s",
                            batch_num, query_attempt + 1, str(e)[:100]
                        )
                        if query_attempt == 2:  # 最后一次尝试
                            logger.error(
                                "批次 %d: Subdomain 查询失败，已达最大重试次数，将抛出异常",
                                batch_num
                            )
                            raise  # 重新抛出，让外层处理
                        # 指数退避，带上限：min(2^attempt, 30)
                        wait_time = min(2 ** query_attempt, 30)
                        time.sleep(wait_time)
                        
                    except Exception as e:
                        # 非预期错误 - 不重试，直接抛出
                        logger.error(
                            "批次 %d: Subdomain 查询遇到非预期错误: %s (%s)",
                            batch_num, str(e), type(e).__name__
                        )
                        raise
            
            # 构建 subdomain_map（只包含缓存中存在且值不为 None 的）
            subdomain_map = {h: subdomain_cache[h] for h in hosts if h in subdomain_cache and subdomain_cache[h] is not None}
            
            # 缓存淘汰延迟到批次处理完成后（在 IP/Port 处理之后）
            
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
            # 批次处理完成后执行缓存淘汰检查
            if _maybe_trim_subdomain_cache(subdomain_cache):
                logger.warning("Subdomain 缓存超过上限，已清空以避免 OOM")
            
            return {
                'created_ips': len(ip_items),
                'created_ports': len(port_items),
                'skipped_no_subdomain': skipped_no_subdomain,
                'skipped_no_ip': skipped_no_ip
            }
            
        except IntegrityError as e:
            # 数据完整性错误（IntegrityError 是 DatabaseError 的子类，需先处理）
            logger.error(
                "批次 %d 数据完整性错误: %s，不进行重试",
                batch_num, str(e)
            )
            # 不重试，直接返回失败结果
            break
        
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
                break
        
        except Exception as e:
            # 其他未预期的错误
            logger.error(
                "批次 %d 未知错误: %s (%s)，不进行重试",
                batch_num, str(e), type(e).__name__
            )
            break
    
    # 如果所有重试都失败，返回失败结果
    return {
        'created_ips': 0,
        'created_ports': 0,
        'skipped_no_subdomain': 0,
        'skipped_no_ip': 0
    }

def _parse_naabu_stream_output(
    cmd: str,
    cwd: Optional[str] = None,
    shell: bool = False
) -> Generator[PortScanRecord, None, None]:
    """
    流式解析 naabu 端口扫描命令输出
    
    基于 stream_command 实时处理 naabu 命令的 stdout，将每行 JSON 输出
    转换为 PortScanRecord 格式，沿用现有字段校验逻辑
    
    Args:
        cmd: naabu 端口扫描命令（如: "naabu -l domains.txt -json"）
        cwd: 工作目录
        shell: 是否使用 shell 执行
    
    Yields:
        PortScanRecord: 每次 yield 一条解析后的端口记录，格式：
        {
            'host': str,          # 域名
            'ip': str,            # IP地址  
            'port': int,          # 端口号
        }
    """
    logger.info("开始流式解析 naabu 端口扫描命令输出 - 命令: %s", cmd)
    
    total_lines = 0
    error_lines = 0
    
    try:
        # 使用 stream_command 获取实时输出流
        for line in stream_command(cmd=cmd, cwd=cwd, shell=shell):
            total_lines += 1
            
            try:
                # 尝试将行解析为 JSON 对象（必须是字典类型）
                try:
                    line_data = json.loads(line)
                    if not isinstance(line_data, dict):
                        logger.warning("解析后的数据不是字典类型，跳过: %s", str(line_data)[:100])
                        error_lines += 1
                        continue
                except json.JSONDecodeError:
                    # JSON 解析失败，跳过该行
                    logger.debug("跳过非 JSON 格式的行: %s", line[:100])
                    error_lines += 1
                    continue
                
                # 提取必要字段
                host = line_data.get('host', '').strip()
                ip = line_data.get('ip', '').strip()  
                port = line_data.get('port')
                
                # 验证必要字段
                if not host or not ip or port is None:
                    logger.warning(
                        "缺少必要字段，跳过: host=%s, ip=%s, port=%s",
                        host, ip, port
                    )
                    error_lines += 1
                    continue
                
                # 确保端口是整数且在有效范围内
                try:
                    port = int(port)
                    if port < 1 or port > 65535:
                        logger.warning("端口号无效 (%d)，跳过", port)
                        error_lines += 1
                        continue
                except (ValueError, TypeError):
                    logger.warning("端口号格式错误，跳过: %s", port)
                    error_lines += 1
                    continue
                
                # yield 一条有效记录

                yield {
                    'host': host,
                    'ip': ip,
                    'port': port,
                }
                
            except Exception as e:
                logger.warning("解析行数据异常: %s - 数据: %s", e, line[:100])
                error_lines += 1
                continue
                
    except Exception as e:
        logger.error("流式解析命令输出失败: %s", e, exc_info=True)
        raise
    
    logger.info(
        "流式解析完成 - 总行数: %d, 错误行数: %d", 
        total_lines, error_lines,
    )


@task(
    name='run_and_stream_save_ports',
    retries=0,
    log_prints=True
)
def run_and_stream_save_ports_task(
    cmd: str,
    scan_id: int,
    target_id: int,
    cwd: Optional[str] = None,
    shell: bool = False,
    batch_size: int = 500
) -> dict:
    """
    执行端口扫描命令并流式保存结果到数据库
    
    该任务将：
    1. 验证输入参数
    2. 构建/执行扫描命令
    3. 调用流式生成器实时解析输出
    4. 按批调用 _save_batch_with_retry 写库
    5. 汇总并返回结果统计
    
    Args:
        cmd: 端口扫描命令（如: "naabu -l domains.txt -json"）
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        cwd: 工作目录（可选）
        shell: 是否使用 shell 执行（默认 False）
        batch_size: 批量保存大小（默认500）
    
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
        RuntimeError: 命令执行或数据库操作失败
    
    Performance:
        - 流式处理，实时解析命令输出
        - 内存占用恒定（只存储一个 batch）
        - 复用现有的批次保存和重试逻辑
        - 使用事务确保数据一致性
    """
    logger.info(
        "开始执行流式端口扫描任务 - target_id=%s, 命令: %s", 
        target_id, cmd
    )
    
    # 参数验证
    if not cmd or not cmd.strip():
        raise ValueError("扫描命令不能为空")
    
    if target_id is None:
        raise ValueError("target_id 不能为 None，必须指定目标ID")
        
    if scan_id is None:
        raise ValueError("scan_id 不能为 None，必须指定扫描ID")
    
    # 验证工作目录（如果指定）
    if cwd and not Path(cwd).exists():
        raise ValueError(f"工作目录不存在: {cwd}")
    
    # 初始化变量
    total_records = 0
    batch_num = 0
    failed_batches = []
    subdomain_cache = {}
    data_generator = None
    
    # 统计信息
    total_created_ips = 0
    total_created_ports = 0
    total_skipped_no_subdomain = 0
    total_skipped_no_ip = 0
    
    try:
        # 创建流式解析生成器
        data_generator = _parse_naabu_stream_output(cmd=cmd, cwd=cwd, shell=shell)
        batch = []
        
        # 流式读取生成器并分批保存
        for record in data_generator:

            batch.append(record)
            total_records += 1
            
            # 达到批次大小，执行保存
            if len(batch) >= batch_size:
                batch_num += 1
                result = _save_batch_with_retry(
                    batch, scan_id, target_id, batch_num, subdomain_cache
                )
                
                # 无论成功与否，都累计统计信息（失败时可能有部分数据已保存）
                total_created_ips += result.get('created_ips', 0)
                total_created_ports += result.get('created_ports', 0)
                total_skipped_no_subdomain += result.get('skipped_no_subdomain', 0)
                total_skipped_no_ip += result.get('skipped_no_ip', 0)
                
                if not result['success']:
                    failed_batches.append(batch_num)
                    logger.warning(
                        "批次 %d 保存失败，但已累计统计信息：创建IP=%d, 创建端口=%d",
                        batch_num, result.get('created_ips', 0), result.get('created_ports', 0)
                    )
                
                batch = []  # 清空批次
                
                # 每20个批次输出进度
                if batch_num % 20 == 0:
                    logger.info("进度: 已处理 %d 批次，%d 条记录", batch_num, total_records)
        
        # 保存最后一批
        if batch:
            batch_num += 1
            result = _save_batch_with_retry(
                batch, scan_id, target_id, batch_num, subdomain_cache
            )
            
            # 无论成功与否，都累计统计信息（失败时可能有部分数据已保存）
            total_created_ips += result.get('created_ips', 0)
            total_created_ports += result.get('created_ports', 0)
            total_skipped_no_subdomain += result.get('skipped_no_subdomain', 0)
            total_skipped_no_ip += result.get('skipped_no_ip', 0)
            
            if not result['success']:
                failed_batches.append(batch_num)
                logger.warning(
                    "批次 %d 保存失败，但已累计统计信息：创建IP=%d, 创建端口=%d",
                    batch_num, result.get('created_ips', 0), result.get('created_ports', 0)
                )
        
        # 输出最终统计
        if failed_batches:
            error_msg = (
                f"流式保存端口扫描结果时出现失败批次，处理记录: {total_records}，"
                f"失败批次: {failed_batches}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)
        
        logger.info(
            "✓ 流式保存完成 - 处理记录: %d（%d 批次），创建IP: %d，创建端口: %d，跳过（无域名）: %d，跳过（无IP）: %d",
            total_records, batch_num, total_created_ips, total_created_ports, 
            total_skipped_no_subdomain, total_skipped_no_ip
        )
        
        # 如果没有创建任何记录，给出明确提示
        if total_created_ips == 0 and total_created_ports == 0:
            logger.warning(
                "⚠️  没有创建任何记录！可能原因：1) 域名不在数据库中 2) 命令输出格式问题 3) 重复数据被忽略"
            )
        
        return {
            'processed_records': total_records,
            'created_ips': total_created_ips,
            'created_ports': total_created_ports,
            'skipped_no_subdomain': total_skipped_no_subdomain,
            'skipped_no_ip': total_skipped_no_ip
        }
        
    except Exception as e:
        error_msg = f"流式执行端口扫描任务失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e
    
    finally:
        # 清理资源
        try:
            # 清理缓存（释放内存）
            if subdomain_cache:
                cache_size = len(subdomain_cache)
                subdomain_cache.clear()
                logger.debug("已清理 subdomain_cache，释放 %d 条缓存记录", cache_size)
            
            # 确保生成器被正确关闭
            if data_generator is not None:
                try:
                    data_generator.close()
                    logger.debug("已关闭数据生成器")
                except Exception as gen_close_error:
                    logger.warning("关闭生成器时出错: %s", gen_close_error)
        
        except Exception as cleanup_error:
            # 清理失败不应影响主流程，只记录警告
            logger.warning("资源清理时出错: %s", cleanup_error)
