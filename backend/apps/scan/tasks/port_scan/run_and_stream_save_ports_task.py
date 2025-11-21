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
import subprocess
import time
from pathlib import Path
from prefect import task
from typing import Generator, List, Optional
from django.db import IntegrityError, OperationalError, DatabaseError
from psycopg2 import InterfaceError
from cachetools import LRUCache
from dataclasses import dataclass


from apps.asset.services import SubdomainService, IPAddressService, PortService
from apps.asset.repositories.django_ip_address_repository import IPAddressDTO
from apps.asset.repositories.django_port_repository import PortDTO
from .types import PortScanRecord

from apps.scan.utils import execute_stream
from apps.common.validators import validate_port

logger = logging.getLogger(__name__)

# LRU 缓存配置
# 最大缓存条目数：10000 条域名记录
# 优点：自动淘汰最少使用的条目，内存占用可控
MAX_SUBDOMAIN_CACHE_SIZE = 10000


@dataclass
class ServiceSet:
    """
    Service 集合，用于依赖注入
    
    提供所有需要的 Service 实例，便于测试时注入 Mock 对象
    """
    subdomain: SubdomainService
    ip_address: IPAddressService
    port: PortService
    
    @classmethod
    def create_default(cls) -> 'ServiceSet':
        """创建默认的 Service 集合"""
        return cls(
            subdomain=SubdomainService(),
            ip_address=IPAddressService(),
            port=PortService()
        )


def _save_batch_with_retry(
    batch: list,
    scan_id: int,
    target_id: int,
    batch_num: int,
    subdomain_cache: LRUCache,
    services: ServiceSet,
    max_retries: int = 3
) -> dict:
    """
    保存一个批次的端口扫描结果（带重试机制）
    
    Args:
        batch: 数据批次
        scan_id: 扫描任务ID
        target_id: 目标ID
        batch_num: 批次编号
        subdomain_cache: 子域名缓存
        services: Service 集合（必须，依赖注入）
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
            stats = _save_batch(batch, scan_id, target_id, batch_num, subdomain_cache, services)
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


def _save_batch(
    batch: list, 
    scan_id: int, 
    target_id: int, 
    batch_num: int, 
    subdomain_cache: LRUCache,
    services: ServiceSet  # Service集合（依赖注入）
) -> dict:
    """
    保存一个批次的数据到数据库（使用 Service 模式）
    
    数据关系链：
        Subdomain (已存在) → IPAddress (待创建/已存在) → Port (待创建)
    
    处理流程（4次数据库操作）：
        1. 查询 Subdomain：根据域名批量查询（Service）
        2. 创建 IPAddress：批量插入 IP 记录，ignore_conflicts（Service，独立短事务）
        3. 查询 IPAddress：获取刚创建的 IP 记录（Service）
        4. 创建 Port：批量插入端口记录，ignore_conflicts（Service，独立短事务）
    
    Args:
        batch: 数据批次，list of {'host', 'ip', 'port'}
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_num: 批次编号（用于日志）
        subdomain_cache: 子域名缓存字典
        services: Service 集合（依赖注入）
    
    Returns:
        dict: 包含创建和跳过记录的统计信息
    
    Raises:
        TypeError: batch 参数类型错误
        IntegrityError: 数据完整性错误
        OperationalError: 数据库操作错误
        DatabaseError: 其他数据库错误
    
    Note:
        此函数不包含重试逻辑，由外层 _save_batch_with_retry 负责重试
    """
    # 参数验证
    if not isinstance(batch, list):
        raise TypeError(f"batch 必须是 list 类型，实际: {type(batch).__name__}")
    
    if not batch:
        logger.debug("批次 %d 为空，跳过处理", batch_num)
        return {
            'created_ips': 0,
            'created_ports': 0,
            'skipped_no_subdomain': 0,
            'skipped_no_ip': 0
        }
    
    # 使用注入的 Service 实例
    subdomain_service = services.subdomain
    ip_service = services.ip_address
    port_service = services.port
    
    # 统计变量
    skipped_no_subdomain = 0
    skipped_no_ip = 0
    
    # ========== Step 1: 批量查询 Subdomain ID（host字符串 → subdomain_id转换）==========
    # 收集当前批次所有 host（字符串形式的域名）
    hosts = {record['host'] for record in batch}
    
    # 先从缓存命中
    cached_hosts = hosts & set(subdomain_cache.keys())
    
    # 对未命中的一次性批量查库
    missing_hosts = hosts - cached_hosts
    if missing_hosts:
        new_data = subdomain_service.get_by_names_and_target_id(missing_hosts, target_id)
        # 查到的写回缓存
        subdomain_cache.update(new_data)
        # 查不到的也标记为 None，避免重复查询
        for host in missing_hosts:
            if host not in subdomain_cache:
                subdomain_cache[host] = None
    
    # 构建 subdomain_map（host → Subdomain对象映射，用于后续获取ID）
    subdomain_map = {h: subdomain_cache[h] for h in hosts if h in subdomain_cache and subdomain_cache[h] is not None}
    
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
        ip_service.bulk_create_ignore_conflicts(ip_items)
    
    # ========== Step 4: 批量查询所有 IPAddress（读操作，无需事务）==========
    ip_map = {}
    if ip_set:
        # 从 ip_set 中提取查询条件
        subdomain_ids = {subdomain_id for subdomain_id, _ in ip_set}
        ip_addrs = {ip_addr for _, ip_addr in ip_set}
        
        # 使用 Service 批量查询
        # 注：上方的 bulk_create 是同步阻塞操作，执行到这里时数据已提交
        # 如果查不到，说明数据本身不存在（如 subdomain 不在库中），而非延迟问题
        ip_map = ip_service.get_by_subdomain_and_ips(subdomain_ids, ip_addrs)
        
        # 验证数据完整性（有助于发现潜在问题）
        if len(ip_map) < len(ip_set):
            logger.warning(
                "批次 %d: IP 创建后查询不完整 - 预期 %d 条，实际查到 %d 条（可能原因：subdomain 不存在或已删除）",
                batch_num, len(ip_set), len(ip_map)
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
                ip_address_id=ip_obj.id,
                subdomain_id=subdomain.id,
                number=port_num,
                service_name=''  # 可以后续添加服务识别
            )
        )
    
    # 批量插入 Port（忽略重复）
    if port_items:
        port_service.bulk_create_ignore_conflicts(port_items)
    
    # LRU 缓存会自动管理淘汰，无需手动检查
    
    return {
        'created_ips': len(ip_items),
        'created_ports': len(port_items),
        'skipped_no_subdomain': skipped_no_subdomain,
        'skipped_no_ip': skipped_no_ip
    }

def _parse_and_validate_line(line: str) -> Optional[PortScanRecord]:
    """
    解析并验证单行 JSON 数据
    
    Args:
        line: 单行输出数据
    
    Returns:
        Optional[PortScanRecord]: 有效的端口扫描记录，或 None 如果验证失败
    
    验证步骤：
        1. 解析 JSON 格式
        2. 验证数据类型为字典
        3. 提取必要字段（host, ip, port）
        4. 验证字段不为空
        5. 验证端口号有效性
    """
    try:
        # 步骤 1: 解析 JSON
        try:
            line_data = json.loads(line)
        except json.JSONDecodeError:
            logger.debug("跳过非 JSON 格式的行: %s", line[:100])
            return None
        
        # 步骤 2: 验证数据类型
        if not isinstance(line_data, dict):
            logger.warning("解析后的数据不是字典类型，跳过: %s", str(line_data)[:100])
            return None
        
        # 步骤 3: 提取必要字段
        host = line_data.get('host', '').strip()
        ip = line_data.get('ip', '').strip()
        port = line_data.get('port')
        
        # 步骤 4: 验证字段不为空
        if not host or not ip or port is None:
            logger.warning(
                "缺少必要字段，跳过: host=%s, ip=%s, port=%s",
                host, ip, port
            )
            return None
        
        # 步骤 5: 验证端口号有效性
        is_valid, port_num = validate_port(port)
        if not is_valid:
            return None
        
        # 返回有效记录
        return {
            'host': host,
            'ip': ip,
            'port': port_num,
        }
    
    except Exception as e:
        logger.error("解析行数据异常: %s - 数据: %s", e, line[:100])
        return None


def _parse_naabu_stream_output(
    cmd: str,
    tool_name: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> Generator[PortScanRecord, None, None]:
    """
    流式解析 naabu 端口扫描命令输出
    
    基于 stream_command 实时处理 naabu 命令的 stdout，将每行 JSON 输出
    转换为 PortScanRecord 格式，沿用现有字段校验逻辑
    
    Args:
        cmd: naabu 端口扫描命令（如: "naabu -l domains.txt -json"）
        tool_name: 工具名称（如: "naabu"）
        cwd: 工作目录
        shell: 是否使用 shell 执行
        timeout: 命令执行超时时间（秒），None 表示不设置超时
        log_file: 日志文件路径（可选）
    
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
        # 使用 execute_stream 获取实时输出流（带工具名、超时控制和日志文件）
        for line in execute_stream(cmd=cmd, tool_name=tool_name, cwd=cwd, shell=shell, timeout=timeout, log_file=log_file):
            total_lines += 1
            
            try:
                # 解析并验证单行数据
                record = _parse_and_validate_line(line)
                if record is None:
                    error_lines += 1
                    continue
                
                # yield 一条有效记录
                yield record
            
            except (json.JSONDecodeError, ValueError, KeyError) as e:
                # 数据解析错误（可恢复）：记录警告但继续处理后续数据
                # 这类错误通常是单条数据格式问题，不应影响整体流程
                error_lines += 1
                logger.warning(
                    "数据解析错误，跳过此行 (行号: %d) - 错误: %s, 原始数据: %s",
                    total_lines, e, line[:100]  # 只记录前100字符避免日志过大
                )
                continue
                
    except subprocess.TimeoutExpired as e:
        # 超时异常：简洁输出，不显示堆栈
        error_msg = f"流式解析命令输出超时 - 命令执行超过 {timeout} 秒"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
    except (IOError, OSError) as e:
        # IO错误（致命）：无法继续读取数据流
        logger.error("流式解析IO错误: %s", e, exc_info=True)
        raise RuntimeError(f"流式解析IO错误: {e}") from e
    
    except (BrokenPipeError, ConnectionError) as e:
        # 连接错误（致命）：进程异常终止或管道断开
        logger.error("流式解析连接错误（进程可能异常终止）: %s", e, exc_info=True)
        raise RuntimeError(f"流式解析连接错误: {e}") from e
    
    except Exception as e:
        # 未预期的异常：输出详细堆栈以便调试
        logger.error(
            "流式解析命令输出失败（未预期的异常）: %s",
            e, exc_info=True
        )
        raise
    
    logger.info(
        "流式解析完成 - 总行数: %d, 错误行数: %d", 
        total_lines, error_lines,
    )


def _validate_task_parameters(cmd: str, target_id: int, scan_id: int, cwd: Optional[str]) -> None:
    """
    验证任务参数的有效性
    
    Args:
        cmd: 扫描命令
        target_id: 目标ID
        scan_id: 扫描ID
        cwd: 工作目录
        
    Raises:
        ValueError: 参数验证失败
    """
    if not cmd or not cmd.strip():
        raise ValueError("扫描命令不能为空")
    
    if target_id is None:
        raise ValueError("target_id 不能为 None，必须指定目标ID")
        
    if scan_id is None:
        raise ValueError("scan_id 不能为 None，必须指定扫描ID")
    
    # 验证工作目录（如果指定）
    if cwd and not Path(cwd).exists():
        raise ValueError(f"工作目录不存在: {cwd}")


def _accumulate_batch_stats(total_stats: dict, batch_result: dict) -> None:
    """
    累加批次统计信息
    
    Args:
        total_stats: 总统计信息字典
        batch_result: 批次结果字典
    """
    total_stats['created_ips'] += batch_result.get('created_ips', 0)
    total_stats['created_ports'] += batch_result.get('created_ports', 0)
    total_stats['skipped_no_subdomain'] += batch_result.get('skipped_no_subdomain', 0)
    total_stats['skipped_no_ip'] += batch_result.get('skipped_no_ip', 0)


def _process_batch(
    batch: list,
    scan_id: int,
    target_id: int,
    batch_num: int,
    subdomain_cache: LRUCache,
    total_stats: dict,
    failed_batches: list,
    services: ServiceSet
) -> None:
    """
    处理单个批次
    
    Args:
        batch: 数据批次
        scan_id: 扫描ID
        target_id: 目标ID
        batch_num: 批次编号
        subdomain_cache: 子域名缓存
        total_stats: 总统计信息
        failed_batches: 失败批次列表
        services: Service 集合（必须，依赖注入）
    """
    result = _save_batch_with_retry(
        batch, scan_id, target_id, batch_num, subdomain_cache, services
    )
    
    # 累计统计信息（失败时可能有部分数据已保存）
    _accumulate_batch_stats(total_stats, result)
    
    if not result['success']:
        failed_batches.append(batch_num)
        logger.warning(
            "批次 %d 保存失败，但已累计统计信息：创建IP=%d, 创建端口=%d",
            batch_num, result.get('created_ips', 0), result.get('created_ports', 0)
        )


def _process_records_in_batches(
    data_generator,
    scan_id: int,
    target_id: int,
    subdomain_cache: LRUCache,
    batch_size: int,
    services: ServiceSet
) -> dict:
    """
    流式处理记录并分批保存
    
    Args:
        data_generator: 数据生成器
        scan_id: 扫描ID
        target_id: 目标ID
        subdomain_cache: 子域名缓存
        batch_size: 批次大小
        services: Service 集合（必须，依赖注入）
        
    Returns:
        dict: 处理统计信息
        
    Raises:
        RuntimeError: 存在失败批次时抛出
        subprocess.TimeoutExpired: 命令执行超时（部分数据已保存）
    
    Note:
        如果发生超时，已处理的数据会被保留在数据库中，
        但扫描任务会被标记为失败。这是预期行为。
    """
    total_records = 0
    batch_num = 0
    failed_batches = []
    batch = []
    
    # 统计信息
    total_stats = {
        'created_ips': 0,
        'created_ports': 0,
        'skipped_no_subdomain': 0,
        'skipped_no_ip': 0
    }
    
    # 流式读取生成器并分批保存
    # 注意：如果超时，subprocess.TimeoutExpired 会从 data_generator 中抛出
    # 此时已处理的数据已经保存到数据库
    for record in data_generator:
        batch.append(record)
        total_records += 1
        
        # 达到批次大小，执行保存
        if len(batch) >= batch_size:
            batch_num += 1
            _process_batch(batch, scan_id, target_id, batch_num, subdomain_cache, total_stats, failed_batches, services)
            batch = []  # 清空批次
            
            # 每20个批次输出进度
            if batch_num % 20 == 0:
                logger.info("进度: 已处理 %d 批次，%d 条记录", batch_num, total_records)
    
    # 保存最后一批
    if batch:
        batch_num += 1
        _process_batch(batch, scan_id, target_id, batch_num, subdomain_cache, total_stats, failed_batches, services)
    
    # 检查失败批次
    if failed_batches:
        error_msg = (
            f"流式保存端口扫描结果时出现失败批次，处理记录: {total_records}，"
            f"失败批次: {failed_batches}"
        )
        logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    return {
        'processed_records': total_records,
        'batch_count': batch_num,
        **total_stats
    }


def _build_final_result(stats: dict) -> dict:
    """
    构建最终结果并输出日志
    
    Args:
        stats: 处理统计信息
        
    Returns:
        dict: 最终结果
    """
    logger.info(
        "✓ 流式保存完成 - 处理记录: %d（%d 批次），创建IP: %d，创建端口: %d，跳过（无域名）: %d，跳过（无IP）: %d",
        stats['processed_records'], stats['batch_count'], stats['created_ips'], stats['created_ports'], 
        stats['skipped_no_subdomain'], stats['skipped_no_ip']
    )
    
    # 如果没有创建任何记录，给出明确提示
    if stats['created_ips'] == 0 and stats['created_ports'] == 0:
        logger.warning(
            "⚠️  没有创建任何记录！可能原因：1) 域名不在数据库中 2) 命令输出格式问题 3) 重复数据被忽略"
        )
    
    return {
        'processed_records': stats['processed_records'],
        'created_ips': stats['created_ips'],
        'created_ports': stats['created_ports'],
        'skipped_no_subdomain': stats['skipped_no_subdomain'],
        'skipped_no_ip': stats['skipped_no_ip']
    }


def _cleanup_resources(data_generator) -> None:
    """
    清理任务资源
    
    Args:
        data_generator: 数据生成器（可以为 None）
    
    Note:
        此函数设计为幂等且安全：
        - 可以多次调用
        - 接受 None 值
        - 捕获所有异常，不会导致 finally 块失败
    """
    # 注：LRUCache 是局部变量，函数结束时会自动释放，无需手动 clear()
    
    # 确保生成器被正确关闭
    if data_generator is None:
        logger.debug("数据生成器为 None，无需清理")
        return
    
    try:
        data_generator.close()
        logger.debug("✓ 已成功关闭数据生成器")
    except StopIteration:
        # 生成器已经正常结束，这是预期行为
        logger.debug("数据生成器已正常结束")
    except GeneratorExit:
        # 生成器已经被关闭，这是预期行为
        logger.debug("数据生成器已被关闭")
    except Exception as gen_close_error:
        # 未预期的错误：记录但不抛出，避免掩盖原始异常
        logger.error(
            "⚠️ 关闭生成器时出错（此错误不会影响任务结果）: %s",
            gen_close_error,
            exc_info=True
        )


@task(
    name='run_and_stream_save_ports',
    retries=0,
    log_prints=True
)
def run_and_stream_save_ports_task(
    cmd: str,
    tool_name: str,
    scan_id: int,
    target_id: int,
    cwd: Optional[str] = None,
    shell: bool = False,
    batch_size: int = 1000,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> dict:
    """
    执行端口扫描命令并流式保存结果到数据库
    
    该任务将：
    1. 验证输入参数
    2. 初始化资源（缓存、生成器）
    3. 流式处理记录并分批保存
    4. 构建并返回结果统计
    
    Args:
        cmd: 端口扫描命令（如: "naabu -l domains.txt -json"）
        tool_name: 工具名称（如: "naabu"）
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        cwd: 工作目录（可选）
        shell: 是否使用 shell 执行（默认 False）
        batch_size: 批量保存大小（默认1000）
        timeout: 命令执行超时时间（秒），None 表示不设置超时
        log_file: 日志文件路径（可选）
    
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
        subprocess.TimeoutExpired: 命令执行超时
    
    Performance:
        - 流式处理，实时解析命令输出
        - 内存占用恒定（只存储一个 batch）
        - 复用现有的批次保存和重试逻辑
        - 使用事务确保数据一致性
    """
    logger.info(
        "开始执行流式端口扫描任务 - target_id=%s, 超时=%s秒, 命令: %s", 
        target_id, timeout if timeout else '无限制', cmd
    )
    
    data_generator = None
    
    try:
        # 1. 验证参数
        _validate_task_parameters(cmd, target_id, scan_id, cwd)
        
        # 2. 初始化资源
        subdomain_cache = LRUCache(maxsize=MAX_SUBDOMAIN_CACHE_SIZE)
        data_generator = _parse_naabu_stream_output(cmd, tool_name, cwd, shell, timeout, log_file)
        services = ServiceSet.create_default()
        
        # 3. 流式处理记录并分批保存
        stats = _process_records_in_batches(
            data_generator, scan_id, target_id, subdomain_cache, batch_size, services
        )
        
        # 4. 构建最终结果
        return _build_final_result(stats)
        
    except subprocess.TimeoutExpired:
        # 超时异常：部分数据已保存，但扫描未完成
        # 这是预期行为：流式处理会实时保存已解析的数据
        logger.error(
            "⚠️ 端口扫描任务超时 - target_id=%s, 超时=%s秒\n"
            "注意：超时前已解析的数据已保存到数据库，但扫描未完全完成。\n"
            "建议：增加超时时间或减少扫描目标数量。",
            target_id, timeout
        )
        raise  # 直接重新抛出，保留异常类型
    
    except Exception as e:
        error_msg = f"流式执行端口扫描任务失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e
    
    finally:
        # 5. 清理资源
        _cleanup_resources(data_generator)
