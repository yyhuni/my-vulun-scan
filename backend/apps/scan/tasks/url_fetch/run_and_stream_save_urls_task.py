"""
基于 execute_stream 的流式 URL 验证任务

主要功能：
    1. 实时执行 httpx 命令验证 URL
    2. 流式处理命令输出，解析 URL 信息
    3. 批量保存到数据库（Endpoint 表）
    4. 避免一次性加载所有 URL 到内存

数据流向：
    httpx 命令执行 → 流式输出 → 实时解析 → 批量保存 → Endpoint 表
    
优化策略：
    - 使用 execute_stream 实时处理输出
    - 流式处理避免内存溢出
    - 批量操作减少数据库交互
    - 保存所有有效 URL（包括 4xx/5xx，便于安全分析）
"""

import logging
import json
import subprocess
import time
from pathlib import Path
from prefect import task
from typing import Generator, Optional, Dict, Any
from django.db import IntegrityError, OperationalError, DatabaseError
from psycopg2 import InterfaceError
from dataclasses import dataclass
from urllib.parse import urlparse

from apps.asset.services.snapshot import EndpointSnapshotsService
from apps.scan.utils import execute_stream

logger = logging.getLogger(__name__)


@dataclass
class ServiceSet:
    """
    Service 集合，用于依赖注入
    
    提供 URL 验证所需的 Service 实例
    """
    snapshot: EndpointSnapshotsService
    
    @classmethod
    def create_default(cls) -> "ServiceSet":
        """创建默认的 Service 集合"""
        return cls(
            snapshot=EndpointSnapshotsService()
        )


def _sanitize_string(value: str) -> str:
    """
    清理字符串中的 NUL 字符和其他不可打印字符
    
    PostgreSQL 不允许字符串字段包含 NUL (0x00) 字符
    """
    if not value:
        return value
    # 移除 NUL 字符
    return value.replace('\x00', '')


def _extract_hostname(url: str) -> str:
    """
    从 URL 提取主机名
    
    Args:
        url: URL 字符串
    
    Returns:
        str: 提取的主机名（小写）
    """
    try:
        if url:
            parsed = urlparse(url)
            if parsed.hostname:
                return parsed.hostname
            # 降级方案：手动提取
            return url.replace('http://', '').replace('https://', '').split('/')[0].split(':')[0]
        return ''
    except Exception as e:
        logger.debug("提取主机名失败: %s", e)
        return ''


class HttpxRecord:
    """httpx 扫描记录数据类"""
    
    def __init__(self, data: Dict[str, Any]):
        self.url = _sanitize_string(data.get('url', ''))
        self.input = _sanitize_string(data.get('input', ''))
        self.title = _sanitize_string(data.get('title', ''))
        self.status_code = data.get('status_code')  # int，不需要清理
        self.content_length = data.get('content_length')  # int，不需要清理
        self.content_type = _sanitize_string(data.get('content_type', ''))
        self.location = _sanitize_string(data.get('location', ''))
        self.webserver = _sanitize_string(data.get('webserver', ''))
        self.response_body = _sanitize_string(data.get('body', ''))
        self.tech = [_sanitize_string(t) for t in data.get('tech', []) if isinstance(t, str)]  # 列表中的字符串也需要清理
        self.vhost = data.get('vhost')  # bool，不需要清理
        self.failed = data.get('failed', False)  # bool，不需要清理
        self.response_headers = _sanitize_string(data.get('raw_header', ''))
        
        # 从 URL 中提取主机名（优先使用 httpx 返回的 host，否则自动提取）
        httpx_host = _sanitize_string(data.get('host', ''))
        self.host = httpx_host if httpx_host else _extract_hostname(self.url)


def _parse_and_validate_line(line: str) -> Optional[HttpxRecord]:
    """
    解析并验证单行 httpx JSON 输出
    
    Args:
        line: 单行输出数据
    
    Returns:
        Optional[HttpxRecord]: 有效的 httpx 记录，或 None 如果验证失败
    """
    try:
        # 清理 NUL 字符后再解析 JSON
        line = _sanitize_string(line)
        
        # 解析 JSON
        try:
            line_data = json.loads(line, strict=False)
        except json.JSONDecodeError:
            return None
        
        # 验证数据类型
        if not isinstance(line_data, dict):
            logger.info("跳过非字典数据")
            return None
        
        # 创建记录
        record = HttpxRecord(line_data)
        
        # 验证必要字段
        if not record.url:
            logger.info("URL 为空，跳过 - 数据: %s", str(line_data)[:200])
            return None
        
        return record
    
    except Exception:
        logger.info("跳过无法解析的行: %s", line[:100] if line else 'empty')
        return None


def _parse_httpx_stream_output(
    cmd: str,
    tool_name: str,
    cwd: Optional[str] = None,
    shell: bool = False,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> Generator[HttpxRecord, None, None]:
    """
    流式解析 httpx 命令输出
    
    Args:
        cmd: httpx 命令
        tool_name: 工具名称（'httpx'）
        cwd: 工作目录
        shell: 是否使用 shell 执行
        timeout: 命令执行超时时间（秒）
        log_file: 日志文件路径
    
    Yields:
        HttpxRecord: 每次 yield 一条存活的 URL 记录
    """
    logger.info("开始流式解析 httpx 输出 - 命令: %s", cmd)
    
    total_lines = 0
    error_lines = 0
    valid_records = 0
    
    try:
        # 使用 execute_stream 获取实时输出流
        for line in execute_stream(
            cmd=cmd, 
            tool_name=tool_name, 
            cwd=cwd, 
            shell=shell, 
            timeout=timeout, 
            log_file=log_file
        ):
            total_lines += 1
            
            # 解析并验证单行数据
            record = _parse_and_validate_line(line)
            if record is None:
                error_lines += 1
                continue
            
            valid_records += 1
            # yield 一条有效记录（存活的 URL）
            yield record
            
            # 每处理 100 条记录输出一次进度
            if valid_records % 100 == 0:
                logger.info("已解析 %d 条存活的 URL...", valid_records)
                
    except subprocess.TimeoutExpired as e:
        error_msg = f"流式解析命令输出超时 - 命令执行超过 {timeout} 秒"
        logger.warning(error_msg)  # 超时是可预期的，使用 warning 级别
        raise RuntimeError(error_msg) from e
    except Exception as e:
        logger.error("流式解析命令输出失败: %s", e, exc_info=True)
        raise
    
    logger.info(
        "流式解析完成 - 总行数: %d, 存活 URL: %d, 无效/死链: %d", 
        total_lines, valid_records, error_lines
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


def _build_final_result(stats: dict) -> dict:
    """
    构建最终结果并输出日志
    
    Args:
        stats: 处理统计信息
        
    Returns:
        dict: 最终结果
    """
    logger.info(
        "✓ URL 验证任务完成 - 处理记录: %d（%d 批次），创建端点: %d，跳过（失败）: %d",
        stats['processed_records'], stats['batch_count'], stats['created_endpoints'],
        stats['skipped_failed']
    )
    
    # 如果没有创建任何记录，给出明确提示
    if stats['created_endpoints'] == 0:
        logger.warning(
            "⚠️  没有创建任何端点记录！可能原因：1) 命令输出格式问题 2) 重复数据被忽略 3) 所有请求都失败"
        )
    
    return {
        'processed_records': stats['processed_records'],
        'created_endpoints': stats['created_endpoints'],
        'skipped_failed': stats['skipped_failed']
    }


def _cleanup_resources(data_generator) -> None:
    """
    清理任务资源
    
    Args:
        data_generator: 数据生成器
    """
    # 确保生成器被正确关闭
    if data_generator is not None:
        try:
            data_generator.close()
            logger.debug("已关闭数据生成器")
        except Exception as gen_close_error:
            logger.error("关闭生成器时出错: %s", gen_close_error)


def _save_batch_with_retry(
    batch: list,
    scan_id: int,
    target_id: int,
    batch_num: int,
    services: ServiceSet,
    max_retries: int = 3
) -> dict:
    """
    保存一个批次的 URL（带重试机制）
    
    Args:
        batch: 数据批次
        scan_id: 扫描任务ID
        target_id: 目标ID
        batch_num: 批次编号
        services: Service 集合
        max_retries: 最大重试次数
    
    Returns:
        dict: {
            'success': bool,
            'created_endpoints': int,
            'skipped_failed': int
        }
    """
    for attempt in range(max_retries):
        try:
            stats = _save_batch(batch, scan_id, target_id, batch_num, services)
            return {
                'success': True,
                'created_endpoints': stats.get('created_endpoints', 0),
                'skipped_failed': stats.get('skipped_failed', 0)
            }

        except IntegrityError as e:
            # 唯一约束等数据完整性错误通常意味着重复数据，这里记录错误但不让整个扫描失败
            logger.error("批次 %d 数据完整性错误，跳过: %s", batch_num, str(e)[:100])
            return {
                'success': False,
                'created_endpoints': 0,
                'skipped_failed': 0
            }

        except (OperationalError, DatabaseError, InterfaceError) as e:
            # 数据库级错误（连接中断、表结构不匹配等）：按指数退避重试，最终失败时抛出异常让 Flow 失败
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                logger.warning(
                    "批次 %d 保存失败（第 %d 次尝试），%d秒后重试: %s",
                    batch_num, attempt + 1, wait_time, str(e)[:100]
                )
                time.sleep(wait_time)
            else:
                logger.error(
                    "批次 %d 保存失败（已重试 %d 次），将终止任务: %s",
                    batch_num,
                    max_retries,
                    e,
                    exc_info=True,
                )
                # 让上层 Task 感知失败，从而标记整个扫描为失败
                raise

        except Exception as e:
            # 其他未知异常也不再吞掉，直接抛出以便 Flow 标记为失败
            logger.error("批次 %d 未知错误: %s", batch_num, e, exc_info=True)
            raise

    # 理论上不会走到这里，保留兜底返回值以满足类型约束
    return {
        'success': False,
        'created_endpoints': 0,
        'skipped_failed': 0
    }


def _save_batch(
    batch: list,
    scan_id: int,
    target_id: int,
    batch_num: int,
    services: ServiceSet
) -> dict:
    """
    保存一个批次的数据到数据库
    
    Args:
        batch: 数据批次，list of HttpxRecord
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_num: 批次编号
        services: Service 集合
    
    Returns:
        dict: 包含创建和跳过记录的统计信息
    """
    # 参数验证
    if not isinstance(batch, list):
        raise TypeError(f"batch 必须是 list 类型，实际: {type(batch).__name__}")
    
    if not batch:
        logger.debug("批次 %d 为空，跳过处理", batch_num)
        return {
            'created_endpoints': 0,
            'skipped_failed': 0
        }
    
    # 统计变量
    skipped_failed = 0
    
    # 批量构造 Endpoint 快照 DTO
    from apps.asset.dtos.snapshot import EndpointSnapshotDTO
    
    snapshots = []
    for record in batch:
        # 跳过失败的请求
        if record.failed:
            skipped_failed += 1
            continue
        
        try:
            # Endpoint URL 直接使用原始值，不做标准化
            # 原因：Endpoint URL 来自 waymore/katana，包含路径和参数，标准化可能改变含义
            url = record.input if record.input else record.url
            
            # 提取 host 字段（域名或IP地址）
            host = record.host if record.host else ''
            
            dto = EndpointSnapshotDTO(
                scan_id=scan_id,
                target_id=target_id,
                url=url,
                host=host,
                title=record.title if record.title else '',
                status_code=record.status_code,
                content_length=record.content_length,
                location=record.location if record.location else '',
                webserver=record.webserver if record.webserver else '',
                content_type=record.content_type if record.content_type else '',
                tech=record.tech if isinstance(record.tech, list) else [],
                response_body=record.response_body if record.response_body else '',
                vhost=record.vhost if record.vhost else False,
                matched_gf_patterns=[],
                response_headers=record.response_headers if record.response_headers else '',
            )
            snapshots.append(dto)
        except Exception as e:
            logger.error("处理记录失败: %s，错误: %s", record.url, e)
            continue
    
    if snapshots:
        try:
            # 通过快照服务统一保存快照并同步到资产表
            services.snapshot.save_and_sync(snapshots)
            count = len(snapshots)
            logger.info(
                "批次 %d: 保存了 %d 个存活的 URL（共 %d 个，跳过失败: %d）",
                batch_num, count, len(batch), skipped_failed
            )
            return {
                'created_endpoints': count,
                'skipped_failed': skipped_failed
            }
        except Exception as e:
            logger.error("批次 %d 批量保存失败: %s", batch_num, e)
            raise
    
    return {
        'created_endpoints': 0,
        'skipped_failed': skipped_failed
    }


def _accumulate_batch_stats(total_stats: dict, batch_result: dict) -> None:
    """
    累加批次统计信息
    
    Args:
        total_stats: 总统计信息字典
        batch_result: 批次结果字典
    """
    total_stats['created_endpoints'] += batch_result.get('created_endpoints', 0)
    total_stats['skipped_failed'] += batch_result.get('skipped_failed', 0)


def _process_batch(
    batch: list,
    scan_id: int,
    target_id: int,
    batch_num: int,
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
        total_stats: 总统计信息
        failed_batches: 失败批次列表
        services: Service 集合（必须，依赖注入）
    """
    result = _save_batch_with_retry(
        batch, scan_id, target_id, batch_num, services
    )
    
    # 累计统计信息（失败时可能有部分数据已保存）
    _accumulate_batch_stats(total_stats, result)
    
    if not result['success']:
        failed_batches.append(batch_num)
        logger.warning(
            "批次 %d 保存失败，但已累计统计信息：创建端点=%d",
            batch_num, result.get('created_endpoints', 0)
        )


def _process_records_in_batches(
    data_generator,
    scan_id: int,
    target_id: int,
    batch_size: int,
    services: ServiceSet
) -> dict:
    """
    流式处理记录并分批保存
    
    Args:
        data_generator: 数据生成器
        scan_id: 扫描ID
        target_id: 目标ID
        batch_size: 批次大小
        services: Service 集合
        
    Returns:
        dict: 处理统计信息
        
    Raises:
        RuntimeError: 存在失败批次时抛出
    """
    total_records = 0
    batch_num = 0
    failed_batches = []
    batch = []
    
    # 统计信息
    total_stats = {
        'created_endpoints': 0,
        'skipped_failed': 0
    }
    
    # 流式读取生成器并分批保存
    for record in data_generator:
        batch.append(record)
        total_records += 1
        
        # 达到批次大小，执行保存
        if len(batch) >= batch_size:
            batch_num += 1
            _process_batch(batch, scan_id, target_id, batch_num, total_stats, failed_batches, services)
            batch = []  # 清空批次
            
            # 每 10 个批次输出进度
            if batch_num % 10 == 0:
                logger.info("进度: 已处理 %d 批次，%d 条记录", batch_num, total_records)
    
    # 保存最后一批
    if batch:
        batch_num += 1
        _process_batch(batch, scan_id, target_id, batch_num, total_stats, failed_batches, services)
    
    # 检查失败批次
    if failed_batches:
        error_msg = (
            f"流式保存 URL 验证结果时出现失败批次，处理记录: {total_records}，"
            f"失败批次: {failed_batches}"
        )
        logger.warning(error_msg)
        raise RuntimeError(error_msg)
    
    return {
        'processed_records': total_records,
        'batch_count': batch_num,
        **total_stats
    }


@task(name="run_and_stream_save_urls", retries=0)
def run_and_stream_save_urls_task(
    cmd: str,
    tool_name: str,
    scan_id: int,
    target_id: int,
    cwd: Optional[str] = None,
    shell: bool = False,
    batch_size: int = 100,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> dict:
    """
    执行 httpx 验证并流式保存存活的 URL
    
    该任务将：
    1. 验证输入参数
    2. 初始化资源（缓存、生成器）
    3. 流式处理记录并分批保存
    4. 构建并返回结果统计
    
    Args:
        cmd: httpx 命令
        tool_name: 工具名称（'httpx'）
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        cwd: 工作目录（可选）
        shell: 是否使用 shell 执行（默认 False）
        batch_size: 批次大小（默认 500）
        timeout: 超时时间（秒）
        log_file: 日志文件路径
    
    Returns:
        dict: {
            'processed_records': int,  # 处理的记录总数
            'created_endpoints': int,  # 创建的端点记录数
            'skipped_failed': int,     # 因请求失败跳过的记录数
        }
    
    Raises:
        ValueError: 参数验证失败
        RuntimeError: 命令执行或数据库操作失败
        subprocess.TimeoutExpired: 命令执行超时
    """
    logger.info(
        "开始执行流式 URL 验证任务 - target_id=%s, 超时=%s秒, 命令: %s",
        target_id, timeout if timeout else '无限制', cmd
    )
    
    data_generator = None
    
    try:
        # 1. 验证参数
        _validate_task_parameters(cmd, target_id, scan_id, cwd)
        
        # 2. 初始化资源
        data_generator = _parse_httpx_stream_output(
            cmd, tool_name, cwd, shell, timeout, log_file
        )
        services = ServiceSet.create_default()
        
        # 3. 流式处理记录并分批保存
        stats = _process_records_in_batches(
            data_generator, scan_id, target_id, batch_size, services
        )
        
        # 4. 构建最终结果
        return _build_final_result(stats)
        
    except subprocess.TimeoutExpired:
        # 超时异常直接向上传播，保留异常类型
        logger.warning(
            "⚠️ URL 验证任务超时 - target_id=%s, 超时=%s秒",
            target_id, timeout
        )
        raise  # 直接重新抛出，不包装
    
    except Exception as e:
        error_msg = f"流式执行 URL 验证任务失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e
    
    finally:
        # 5. 清理资源
        _cleanup_resources(data_generator)
