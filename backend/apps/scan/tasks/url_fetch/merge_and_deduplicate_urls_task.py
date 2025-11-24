"""
合并并去重 URL 任务

合并多个工具的输出文件，去重并验证 URL 格式
性能优化：使用系统命令处理大文件
"""

import logging
import uuid
import subprocess
from pathlib import Path
from datetime import datetime
from prefect import task
from typing import List
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


@task(
    name='merge_and_deduplicate_urls',
    retries=1,
    log_prints=True
)
def merge_and_deduplicate_urls_task(
    result_files: List[str],
    result_dir: str
) -> str:
    """
    合并扫描结果并去重（高性能流式处理）
    
    流程：
    1. 使用 LC_ALL=C sort -u 直接处理多文件
    2. 验证 URL 格式
    3. 返回去重后的文件路径
    
    Args:
        result_files: 结果文件路径列表
        result_dir: 结果目录
    
    Returns:
        str: 去重后的 URL 文件路径
    
    Raises:
        RuntimeError: 处理失败
    """
    logger.info(f"开始合并并去重 {len(result_files)} 个结果文件")
    
    result_path = Path(result_dir)
    
    # 验证文件存在性
    valid_files = []
    for file_path_str in result_files:
        file_path = Path(file_path_str)
        if file_path.exists() and file_path.stat().st_size > 0:
            valid_files.append(str(file_path))
        else:
            logger.warning(f"结果文件不存在或为空: {file_path}")
    
    if not valid_files:
        # 创建空文件
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        short_uuid = uuid.uuid4().hex[:4]
        empty_file = result_path / f"empty_{timestamp}_{short_uuid}.txt"
        empty_file.touch()
        logger.warning("所有结果文件都不存在或为空，创建空文件")
        return str(empty_file)
    
    # 生成输出文件路径
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    short_uuid = uuid.uuid4().hex[:4]
    temp_file = result_path / f"temp_{timestamp}_{short_uuid}.txt"
    merged_file = result_path / f"merged_{timestamp}_{short_uuid}.txt"
    
    try:
        # Step 1: 合并并去重（系统命令）
        cmd = f"LC_ALL=C sort -u {' '.join(valid_files)} -o {temp_file}"
        logger.debug(f"执行命令: {cmd}")
        
        result = subprocess.run(
            cmd,
            shell=True,
            check=True,
            timeout=3600  # 60分钟超时
        )
        
        logger.debug("✓ 合并去重完成")
        
        # Step 2: 验证 URL 格式并清理
        valid_urls = []
        invalid_count = 0
        
        with open(temp_file, 'r') as f:
            for line in f:
                url = line.strip()
                if not url:
                    continue
                
                # 验证 URL 基本格式
                if _is_valid_url(url):
                    valid_urls.append(url)
                else:
                    invalid_count += 1
                    if invalid_count <= 10:  # 只记录前10个无效URL
                        logger.debug(f"无效 URL: {url}")
        
        # 写入有效的 URL
        with open(merged_file, 'w') as f:
            for url in valid_urls:
                f.write(f"{url}\n")
        
        # 删除临时文件
        temp_file.unlink(missing_ok=True)
        
        # Step 3: 统计结果
        unique_count = len(valid_urls)
        
        if unique_count == 0:
            logger.warning("未找到任何有效 URL")
        else:
            file_size = merged_file.stat().st_size
            logger.info(
                f"✓ 合并去重完成 - 有效 URL: {unique_count}, "
                f"无效: {invalid_count}, 文件大小: {file_size / 1024:.2f} KB"
            )
        
        return str(merged_file)
        
    except subprocess.TimeoutExpired:
        logger.error("合并去重超时（60分钟）")
        raise RuntimeError("合并去重超时")
    except subprocess.CalledProcessError as e:
        logger.error(f"系统命令执行失败: {e}")
        raise RuntimeError(f"合并去重失败: {e}") from e
    except Exception as e:
        logger.error(f"合并去重失败: {e}", exc_info=True)
        raise RuntimeError(f"合并去重失败: {e}") from e
    finally:
        # 清理临时文件
        if temp_file.exists():
            temp_file.unlink(missing_ok=True)


def _is_valid_url(url: str) -> bool:
    """
    验证 URL 格式
    
    Args:
        url: URL 字符串
        
    Returns:
        bool: 是否为有效 URL
    """
    if not url:
        return False
    
    # 基本检查
    if not (url.startswith('http://') or url.startswith('https://')):
        # 尝试添加协议
        if '://' not in url:
            url = f'http://{url}'
        else:
            return False  # 有协议但不是 http/https
    
    try:
        result = urlparse(url)
        # 必须有 scheme 和 netloc
        return all([result.scheme, result.netloc])
    except:
        return False
