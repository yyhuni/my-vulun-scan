"""
解析 naabu 端口扫描结果任务

主要功能：
    解析 naabu 输出的 JSONL 格式文件，提取端口和 IP 信息

输入格式（naabu）：
    {"host": "www.example.com", "ip": "1.1.1.1", "port": 80, ...}

输出格式（标准化）：
    {"host": "www.example.com", "ip": "1.1.1.1", "port": 80}

特点：
    - 使用生成器实现懒加载（边解析边 yield）
    - 内存占用低，支持大文件解析
    - 自动过滤无效记录
"""

import logging
import json
from pathlib import Path
from typing import Generator
from prefect import task

from .types import PortScanRecord

logger = logging.getLogger(__name__)


@task(name="parse_naabu_result")
def parse_naabu_result_task(result_files: list) -> Generator[PortScanRecord, None, None]:
    """
    解析 naabu 扫描结果文件（JSONL 格式）
    
    使用生成器实现懒加载，边解析边 yield，不会一次性加载所有数据到内存
    
    naabu 输出格式（每行一个 JSON 对象）：
    {
        "host": "news.xinye.com",
        "ip": "198.18.7.117",
        "timestamp": "2025-11-11T11:59:36.252238Z",
        "port": 443,
        "protocol": "tcp",
        "tls": false
    }
    
    Args:
        result_files: naabu 结果文件路径列表
    
    Yields:
        dict: 每次 yield 一条解析后的数据，格式：
        {
            'host': str,          # 域名
            'ip': str,            # IP地址
            'port': int,          # 端口号
        }
    
    Returns:
        Generator: 返回生成器对象，可用 for 循环遍历
    
    Note:
        - 使用生成器实现流式处理，内存占用恒定
        - 跳过解析失败的行，记录警告日志
        - 不处理去重，由数据库唯一约束自动忽略重复记录
    
    Usage:
        data_gen = parse_naabu_result_task(result_files)
        for record in data_gen:
            # 处理每条记录
            ...
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
    
    # 生成器执行完毕后记录统计信息
    logger.info(
        "✓ naabu 结果解析完成 - 总行数: %d, 错误行数: %d, 有效记录: %d",
        total_lines, error_lines, valid_records
    )
