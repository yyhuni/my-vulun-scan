"""
解析并保存站点扫描结果任务

主要功能：
    1. 解析 httpx 站点扫描结果文件（JSON Lines 格式）
    2. 保存站点信息（WebSite）- 核心资产
    3. 建立数据关联：Subdomain → WebSite

数据流向：
    httpx结果文件 → 解析生成器 → 批量处理 → 数据库
    
    输入：httpx扫描结果文件
    输出：WebSite 记录

优化策略：
    - 流式处理避免内存溢出
    - 批量操作减少数据库交互（500条/批次）
    - 优化事务粒度（短事务）+ 重试机制保证最终一致性
"""

import logging
import time
import sys
import json
from pathlib import Path
from prefect import task
from typing import Generator, Dict, Any
from django.db import IntegrityError, OperationalError, DatabaseError
from urllib.parse import urlparse

from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository
from apps.asset.repositories.django_website_repository import DjangoWebSiteRepository
from apps.asset.repositories.website_repository import WebSiteDTO

logger = logging.getLogger(__name__)

MAX_SUBDOMAIN_CACHE_BYTES = 100 * 1024 * 1024

def _approx_size_bytes(obj) -> int:
    try:
        return sys.getsizeof(obj)
    except Exception:
        return 0

def _estimate_subdomain_cache_size(cache: dict) -> int:
    """估算 subdomain 缓存的内存占用"""
    total_size = 0
    for key, value in cache.items():
        total_size += _approx_size_bytes(key)
        total_size += _approx_size_bytes(value)
    return total_size

def _maybe_trim_subdomain_cache(cache: dict) -> bool:
    """如果缓存过大，清空缓存避免 OOM"""
    if _estimate_subdomain_cache_size(cache) > MAX_SUBDOMAIN_CACHE_BYTES:
        cache.clear()
        return True
    return False


class HttpxRecord:
    """httpx扫描记录数据类"""
    
    def __init__(self, data: Dict[str, Any]):
        self.url = data.get('url', '')
        self.input = data.get('input', '')
        self.title = data.get('title', '')
        self.status_code = data.get('status_code')
        self.content_length = data.get('content_length')
        self.content_type = data.get('content_type', '')
        self.location = data.get('location', '')
        self.webserver = data.get('webserver', '')
        self.body_preview = data.get('body_preview', '')
        self.tech = data.get('tech', [])
        self.vhost = data.get('vhost')
        self.failed = data.get('failed', False)
        
        # 从URL中提取主机名
        try:
            parsed = urlparse(self.url)
            self.host = parsed.hostname or self.input
        except Exception:
            self.host = self.input


def _parse_httpx_file(file_path: str) -> Generator[HttpxRecord, None, None]:
    """
    解析 httpx 结果文件（JSON Lines 格式）
    
    Args:
        file_path: httpx结果文件路径
        
    Yields:
        HttpxRecord: 解析后的记录
    """
    logger.info("开始解析 httpx 结果文件: %s", file_path)
    
    path = Path(file_path)
    if not path.exists():
        logger.warning("文件不存在: %s", file_path)
        return
    
    if path.stat().st_size == 0:
        logger.warning("文件为空: %s", file_path)
        return
    
    line_count = 0
    valid_count = 0
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line_count += 1
                line = line.strip()
                
                if not line:
                    continue
                
                try:
                    data = json.loads(line)
                    record = HttpxRecord(data)
                    
                    # 基本验证
                    if not record.url:
                        logger.debug("第 %d 行: URL为空，跳过", line_num)
                        continue
                    
                    valid_count += 1
                    yield record
                    
                except json.JSONDecodeError as e:
                    logger.warning("第 %d 行: JSON解析失败: %s", line_num, e)
                    continue
                except Exception as e:
                    logger.warning("第 %d 行: 记录处理失败: %s", line_num, e)
                    continue
                
                # 每处理10000行打印一次进度
                if line_count % 10000 == 0:
                    logger.info("已处理 %d 行，有效记录 %d 条...", line_count, valid_count)
    
    except Exception as e:
        logger.error("解析文件失败: %s", e)
        raise
    
    logger.info(
        "✓ 文件解析完成 - 总行数: %d, 有效记录: %d, 文件: %s",
        line_count, valid_count, path.name
    )


@task(name="parse_and_save_websites")
def parse_and_save_websites_task(
    result_file: str,
    scan_id: int,
    target_id: int,
    batch_size: int = 500
) -> dict:
    """
    解析 httpx 结果文件并保存到数据库
    
    Args:
        result_file: httpx结果文件路径
        scan_id: 扫描任务ID
        target_id: 目标ID
        batch_size: 批处理大小，默认500
        
    Returns:
        dict: {
            'success': bool,
            'processed_records': int,
            'created_websites': int,
            'skipped_no_subdomain': int,
            'skipped_failed': int
        }
    """
    logger.info(
        "开始解析并保存站点扫描结果 - 文件: %s, Scan ID: %d, Target ID: %d",
        result_file, scan_id, target_id
    )
    
    # 统计变量
    processed_records = 0
    created_websites = 0
    skipped_no_subdomain = 0
    skipped_failed = 0
    
    # Subdomain 缓存（避免重复查询）
    subdomain_cache = {}
    
    try:
        # 解析文件并批量处理
        batch = []
        
        for record in _parse_httpx_file(result_file):
            processed_records += 1
            
            # 跳过失败的请求
            if record.failed:
                skipped_failed += 1
                continue
            
            batch.append(record)
            
            # 达到批次大小时处理
            if len(batch) >= batch_size:
                batch_result = _save_batch(
                    batch, scan_id, target_id, 
                    processed_records // batch_size + 1,
                    subdomain_cache
                )
                
                created_websites += batch_result['created_websites']
                skipped_no_subdomain += batch_result['skipped_no_subdomain']
                
                batch = []
        
        # 处理最后一批
        if batch:
            batch_result = _save_batch(
                batch, scan_id, target_id,
                processed_records // batch_size + 1,
                subdomain_cache
            )
            
            created_websites += batch_result['created_websites']
            skipped_no_subdomain += batch_result['skipped_no_subdomain']
        
        logger.info(
            "✓ 站点扫描结果保存完成 - 处理记录: %d, 创建站点: %d, 跳过无子域名: %d, 跳过失败: %d",
            processed_records, created_websites, skipped_no_subdomain, skipped_failed
        )
        
        return {
            'success': True,
            'processed_records': processed_records,
            'created_websites': created_websites,
            'skipped_no_subdomain': skipped_no_subdomain,
            'skipped_failed': skipped_failed
        }
        
    except Exception as e:
        logger.exception("解析并保存站点扫描结果失败: %s", e)
        raise


def _save_batch(batch: list, scan_id: int, target_id: int, batch_num: int, subdomain_cache: dict, max_retries: int = 3) -> dict:
    """
    保存一个批次的数据到数据库
    
    数据关系链：
        Subdomain (已存在) → WebSite (待创建)
    
    处理流程：
        1. 查询 Subdomain：根据域名批量查询
        2. 创建 WebSite：批量插入站点记录，ignore_conflicts
    
    Args:
        batch: 数据批次，list of HttpxRecord
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_num: 批次编号（用于日志）
        subdomain_cache: 子域名缓存
        max_retries: 最大重试次数（默认3次）
    """
    # 初始化 Repository
    subdomain_repo = DjangoSubdomainRepository()
    website_repo = DjangoWebSiteRepository()
    
    # 统计变量
    skipped_no_subdomain = 0
    
    # 重试机制：确保数据最终一致性
    for attempt in range(max_retries):
        try:
            # ========== Step 1: 批量查询 Subdomain（读操作，无需事务）==========
            hosts = {record.host for record in batch}
            uncached = hosts - set(subdomain_cache.keys())
            if uncached:
                new_data = subdomain_repo.get_by_names(uncached, target_id)
                subdomain_cache.update(new_data)
                if _maybe_trim_subdomain_cache(subdomain_cache):
                    logger.warning("Subdomain 缓存超过上限，已清空以避免 OOM")
            subdomain_map = {h: subdomain_cache[h] for h in hosts if h in subdomain_cache}
            
            # ========== Step 2: 准备 WebSite 数据（内存操作，无需事务）==========
            website_items = []
            
            for record in batch:
                subdomain = subdomain_map.get(record.host)
                if not subdomain:
                    skipped_no_subdomain += 1
                    continue
                
                # 创建 WebSite DTO
                website_dto = WebSiteDTO(
                    scan_id=scan_id,
                    target_id=target_id,
                    subdomain_id=subdomain.id,
                    url=record.url,
                    location=record.location,
                    title=record.title[:1000] if record.title else '',  # 限制长度
                    webserver=record.webserver[:200] if record.webserver else '',
                    body_preview=record.body_preview[:1000] if record.body_preview else '',  # 限制长度
                    content_type=record.content_type[:200] if record.content_type else '',
                    tech=record.tech if isinstance(record.tech, list) else [],
                    status_code=record.status_code,
                    content_length=record.content_length,
                    vhost=record.vhost
                )
                
                website_items.append(website_dto)
            
            # ========== Step 3: 批量创建 WebSite（Repository 内部独立短事务）==========
            if website_items:
                website_repo.bulk_create_ignore_conflicts(website_items)
            
            # 🎉 成功完成，退出重试循环
            return {
                'created_websites': len(website_items),
                'skipped_no_subdomain': skipped_no_subdomain
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
                return {
                    'created_websites': 0,
                    'skipped_no_subdomain': 0
                }
        
        except IntegrityError as e:
            # 数据完整性错误，不应重试
            logger.error("批次 %d 数据完整性错误，跳过: %s", batch_num, str(e)[:100])
            return {
                'created_websites': 0,
                'skipped_no_subdomain': 0
            }
        
        except Exception as e:
            # 其他未知错误
            logger.error("批次 %d 未知错误: %s", batch_num, e, exc_info=True)
            return {
                'created_websites': 0,
                'skipped_no_subdomain': 0
            }
    
    return {
        'created_websites': 0,
        'skipped_no_subdomain': 0
    }
