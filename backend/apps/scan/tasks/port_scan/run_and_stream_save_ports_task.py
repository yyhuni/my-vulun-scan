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
from pathlib import Path
from prefect import task
from typing import Generator, List, Optional

from apps.scan.utils.stream_command import stream_command
from .types import PortScanRecord

logger = logging.getLogger(__name__)


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

def _parse_stream_output(
    cmd: str,
    cwd: Optional[str] = None,
    shell: bool = False
) -> Generator[PortScanRecord, None, None]:
    """
    流式解析端口扫描命令输出
    
    基于 stream_command 实时处理命令的 stdout，将每行 JSON 输出
    转换为 PortScanRecord 格式，沿用现有字段校验逻辑
    
    Args:
        cmd: 端口扫描命令（如: "naabu -l domains.txt -json"）
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
    logger.info("开始流式解析端口扫描命令输出 - 命令: %s", cmd)
    
    total_lines = 0
    error_lines = 0
    valid_records = 0
    
    try:
        # 使用 stream_command 获取实时输出流
        for line_data in stream_command(cmd=cmd, cwd=cwd, shell=shell):
            total_lines += 1
            
            try:
                # stream_command 已经解析为 JSON 对象
                if not isinstance(line_data, dict):
                    logger.warning("收到非 JSON 格式数据，跳过: %s", str(line_data)[:100])
                    error_lines += 1
                    continue
                
                # 提取必要字段（与现有逻辑保持一致）
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
                valid_records += 1
                yield {
                    'host': host,
                    'ip': ip,
                    'port': port,
                }
                
                # 每1000条记录输出一次进度
                if valid_records % 1000 == 0:
                    logger.info("已解析 %d 条有效记录", valid_records)
                
            except Exception as e:
                logger.warning("解析行数据异常: %s - 数据: %s", e, str(line_data)[:100])
                error_lines += 1
                continue
                
    except Exception as e:
        logger.error("流式解析命令输出失败: %s", e, exc_info=True)
        raise
    
    logger.info(
        "流式解析完成 - 总行数: %d, 错误行数: %d, 有效记录: %d", 
        total_lines, error_lines, valid_records
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
    
    # 创建流式解析生成器
    try:
        data_generator = _parse_stream_output(cmd=cmd, cwd=cwd, shell=shell)
    except Exception as e:
        error_msg = f"创建流式解析生成器失败: {e}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from e
    
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
                result = _save_batch_with_retry(
                    batch, scan_id, target_id, batch_num, subdomain_cache
                )
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
            result = _save_batch_with_retry(
                batch, scan_id, target_id, batch_num, subdomain_cache
            )
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
