"""
xingfinger 执行任务

流式执行 xingfinger 命令并实时更新 tech 字段
"""

import json
import logging
import subprocess
from typing import Optional, Generator
from urllib.parse import urlparse

from django.db import connection
from prefect import task

from apps.scan.utils import execute_stream
from apps.asset.dtos.snapshot import WebsiteSnapshotDTO
from apps.asset.repositories.snapshot import DjangoWebsiteSnapshotRepository

logger = logging.getLogger(__name__)


def parse_xingfinger_line(line: str) -> dict | None:
    """
    解析 xingfinger 单行 JSON 输出
    
    xingfinger 输出格式：
    {"url": "...", "cms": "...", "server": "BWS/1.1", "status_code": 200, "length": 642831, "title": "..."}
    
    Returns:
        dict: 包含 url, techs, server, title, status_code, content_length 的字典
        None: 解析失败或 URL 为空时
    """
    try:
        item = json.loads(line)
        url = item.get('url', '').strip()
        
        if not url:
            return None
        
        # cms 字段按逗号分割，去除空白
        cms = item.get('cms', '')
        techs = [t.strip() for t in cms.split(',') if t.strip()] if cms else []
        
        return {
            'url': url,
            'techs': techs,
            'server': item.get('server', ''),
            'title': item.get('title', ''),
            'status_code': item.get('status_code'),
            'content_length': item.get('length'),
        }
        
    except json.JSONDecodeError:
        return None


def bulk_merge_website_fields(
    records: list[dict],
    target_id: int
) -> dict:
    """
    批量合并更新 WebSite 字段（PostgreSQL 原生 SQL）
    
    合并策略：
    - tech：数组合并去重
    - title, webserver, status_code, content_length：只在原值为空/NULL 时更新
    
    如果 URL 对应的记录不存在，会自动创建新记录。
    
    Args:
        records: 解析后的记录列表，每个包含 {url, techs, server, title, status_code, content_length}
        target_id: 目标 ID
    
    Returns:
        dict: {'updated_count': int, 'created_count': int}
    """
    from apps.asset.models import WebSite
    table_name = WebSite._meta.db_table
    
    updated_count = 0
    created_count = 0
    
    with connection.cursor() as cursor:
        for record in records:
            url = record['url']
            techs = record.get('techs', [])
            server = record.get('server', '') or ''
            title = record.get('title', '') or ''
            status_code = record.get('status_code')
            content_length = record.get('content_length')
            
            # 先尝试更新（合并策略）
            update_sql = f"""
                UPDATE {table_name}
                SET 
                    tech = (SELECT ARRAY(SELECT DISTINCT unnest(
                        COALESCE(tech, ARRAY[]::varchar[]) || %s::varchar[]
                    ))),
                    title = CASE WHEN title = '' OR title IS NULL THEN %s ELSE title END,
                    webserver = CASE WHEN webserver = '' OR webserver IS NULL THEN %s ELSE webserver END,
                    status_code = CASE WHEN status_code IS NULL THEN %s ELSE status_code END,
                    content_length = CASE WHEN content_length IS NULL THEN %s ELSE content_length END
                WHERE url = %s AND target_id = %s
            """
            
            cursor.execute(update_sql, [techs, title, server, status_code, content_length, url, target_id])
            
            if cursor.rowcount > 0:
                updated_count += cursor.rowcount
            else:
                # 记录不存在，创建新记录
                try:
                    # 从 URL 提取 host
                    parsed = urlparse(url)
                    host = parsed.hostname or ''
                    
                    # 插入新记录（带冲突处理）
                    insert_sql = f"""
                        INSERT INTO {table_name} (
                            target_id, url, host, location, title, webserver, 
                            body_preview, content_type, tech, status_code, content_length,
                            response_headers, created_at
                        )
                        VALUES (%s, %s, %s, '', %s, %s, '', '', %s::varchar[], %s, %s, '{{}}'::jsonb, NOW())
                        ON CONFLICT (target_id, url) DO UPDATE SET
                            tech = (SELECT ARRAY(SELECT DISTINCT unnest(
                                COALESCE({table_name}.tech, ARRAY[]::varchar[]) || EXCLUDED.tech
                            ))),
                            title = CASE WHEN {table_name}.title = '' OR {table_name}.title IS NULL THEN EXCLUDED.title ELSE {table_name}.title END,
                            webserver = CASE WHEN {table_name}.webserver = '' OR {table_name}.webserver IS NULL THEN EXCLUDED.webserver ELSE {table_name}.webserver END,
                            status_code = CASE WHEN {table_name}.status_code IS NULL THEN EXCLUDED.status_code ELSE {table_name}.status_code END,
                            content_length = CASE WHEN {table_name}.content_length IS NULL THEN EXCLUDED.content_length ELSE {table_name}.content_length END
                    """
                    cursor.execute(insert_sql, [target_id, url, host, title, server, techs, status_code, content_length])
                    created_count += 1
                    
                except Exception as e:
                    logger.warning("创建 WebSite 记录失败 (url=%s): %s", url, e)
    
    return {
        'updated_count': updated_count,
        'created_count': created_count
    }


def _parse_xingfinger_stream_output(
    cmd: str,
    tool_name: str,
    cwd: Optional[str] = None,
    timeout: Optional[int] = None,
    log_file: Optional[str] = None
) -> Generator[dict, None, None]:
    """
    流式解析 xingfinger 命令输出
    
    基于 execute_stream 实时处理 xingfinger 命令的 stdout，将每行 JSON 输出
    转换为完整字段字典
    """
    logger.info("开始流式解析 xingfinger 命令输出 - 命令: %s", cmd)
    
    total_lines = 0
    valid_records = 0
    
    try:
        for line in execute_stream(cmd=cmd, tool_name=tool_name, cwd=cwd, shell=True, timeout=timeout, log_file=log_file):
            total_lines += 1
            
            # 解析单行 JSON
            result = parse_xingfinger_line(line)
            if result is None:
                continue
            
            valid_records += 1
            yield result
            
            # 每处理 500 条记录输出一次进度
            if valid_records % 500 == 0:
                logger.info("已解析 %d 条有效记录...", valid_records)
                
    except subprocess.TimeoutExpired as e:
        error_msg = f"xingfinger 命令执行超时 - 超过 {timeout} 秒"
        logger.warning(error_msg)
        raise RuntimeError(error_msg) from e
    except Exception as e:
        logger.error("流式解析 xingfinger 输出失败: %s", e, exc_info=True)
        raise
    
    logger.info("流式解析完成 - 总行数: %d, 有效记录: %d", total_lines, valid_records)


@task(name="run_xingfinger_and_stream_update_tech")
def run_xingfinger_and_stream_update_tech_task(
    cmd: str,
    tool_name: str,
    scan_id: int,
    target_id: int,
    source: str,
    cwd: str,
    timeout: int,
    log_file: str,
    batch_size: int = 100
) -> dict:
    """
    流式执行 xingfinger 命令，保存快照并合并更新资产表
    
    处理流程：
    1. 流式执行 xingfinger 命令
    2. 实时解析 JSON 输出（完整字段）
    3. 累积到 batch_size 条后批量处理：
       - 保存快照（WebsiteSnapshot）
       - 合并更新资产表（WebSite）
    
    合并策略：
    - tech：数组合并去重
    - title, webserver, status_code, content_length：只在原值为空时更新
    
    Returns:
        dict: {
            'processed_records': int,
            'updated_count': int,
            'created_count': int,
            'snapshot_count': int,
            'batch_count': int
        }
    """
    logger.info(
        "开始执行 xingfinger - scan_id=%s, target_id=%s, timeout=%s秒",
        scan_id, target_id, timeout
    )
    
    data_generator = None
    snapshot_repo = DjangoWebsiteSnapshotRepository()
    
    try:
        # 初始化统计
        processed_records = 0
        updated_count = 0
        created_count = 0
        snapshot_count = 0
        batch_count = 0
        
        # 当前批次的记录列表
        batch_records = []
        
        # 流式处理
        data_generator = _parse_xingfinger_stream_output(
            cmd=cmd,
            tool_name=tool_name,
            cwd=cwd,
            timeout=timeout,
            log_file=log_file
        )
        
        for record in data_generator:
            processed_records += 1
            batch_records.append(record)
            
            # 达到批次大小，执行批量处理
            if len(batch_records) >= batch_size:
                batch_count += 1
                result = _process_batch(
                    batch_records, scan_id, target_id, batch_count, snapshot_repo
                )
                updated_count += result['updated_count']
                created_count += result['created_count']
                snapshot_count += result['snapshot_count']
                
                # 清空批次
                batch_records = []
        
        # 处理最后一批
        if batch_records:
            batch_count += 1
            result = _process_batch(
                batch_records, scan_id, target_id, batch_count, snapshot_repo
            )
            updated_count += result['updated_count']
            created_count += result['created_count']
            snapshot_count += result['snapshot_count']
        
        logger.info(
            "✓ xingfinger 执行完成 - 处理: %d, 更新: %d, 创建: %d, 快照: %d, 批次: %d",
            processed_records, updated_count, created_count, snapshot_count, batch_count
        )
        
        return {
            'processed_records': processed_records,
            'updated_count': updated_count,
            'created_count': created_count,
            'snapshot_count': snapshot_count,
            'batch_count': batch_count
        }
        
    except subprocess.TimeoutExpired:
        logger.warning("⚠️ xingfinger 执行超时 - target_id=%s, timeout=%s秒", target_id, timeout)
        raise
    except Exception as e:
        error_msg = f"xingfinger 执行失败: {e}"
        logger.error(error_msg, exc_info=True)
        raise RuntimeError(error_msg) from e
    finally:
        # 清理资源
        if data_generator is not None:
            try:
                data_generator.close()
            except Exception as e:
                logger.debug("关闭生成器时出错: %s", e)


def _process_batch(
    records: list[dict],
    scan_id: int,
    target_id: int,
    batch_num: int,
    snapshot_repo: DjangoWebsiteSnapshotRepository
) -> dict:
    """
    处理一个批次的数据：保存快照 + 合并更新资产表
    
    Args:
        records: 解析后的记录列表
        scan_id: 扫描任务 ID
        target_id: 目标 ID
        batch_num: 批次编号
        snapshot_repo: 快照仓库
    
    Returns:
        dict: {'updated_count': int, 'created_count': int, 'snapshot_count': int}
    """
    # 1. 构建快照 DTO 列表
    snapshot_dtos = []
    for record in records:
        # 从 URL 提取 host
        parsed = urlparse(record['url'])
        host = parsed.hostname or ''
        
        dto = WebsiteSnapshotDTO(
            scan_id=scan_id,
            target_id=target_id,
            url=record['url'],
            host=host,
            title=record.get('title', '') or '',
            status=record.get('status_code'),
            content_length=record.get('content_length'),
            web_server=record.get('server', '') or '',
            tech=record.get('techs', []),
        )
        snapshot_dtos.append(dto)
    
    # 2. 保存快照
    snapshot_count = 0
    if snapshot_dtos:
        try:
            snapshot_repo.save_snapshots(snapshot_dtos)
            snapshot_count = len(snapshot_dtos)
        except Exception as e:
            logger.warning("批次 %d 保存快照失败: %s", batch_num, e)
    
    # 3. 合并更新资产表
    merge_result = bulk_merge_website_fields(records, target_id)
    
    logger.debug(
        "批次 %d 完成 - 更新: %d, 创建: %d, 快照: %d",
        batch_num, merge_result['updated_count'], merge_result['created_count'], snapshot_count
    )
    
    return {
        'updated_count': merge_result['updated_count'],
        'created_count': merge_result['created_count'],
        'snapshot_count': snapshot_count
    }
