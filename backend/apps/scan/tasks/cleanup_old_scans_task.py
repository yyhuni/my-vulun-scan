"""
定时清理扫描结果任务模块

负责定期清理过期的扫描结果目录，释放磁盘空间

队列策略：
- 使用 orchestrator 队列（轻量级、维护任务）
- 特点：定时执行、批量清理
- Worker 配置建议：低并发（-c 5）
"""

import logging
import os
import time
from pathlib import Path

from celery import shared_task
from django.conf import settings

from apps.scan.utils import remove_directory

logger = logging.getLogger(__name__)


@shared_task(name='cleanup_old_scans', bind=True)
def cleanup_old_scans_task(self) -> dict:
    """
    清理超过保留期限的扫描结果目录
    
    职责：
    - 扫描 SCAN_RESULTS_DIR 目录下的所有子目录
    - 根据目录的修改时间判断是否过期
    - 删除超过保留期限的目录
    
    清理策略（从 settings 读取）：
    - 基于文件系统时间戳，不依赖数据库
    - 所有目录统一保留 N 天（默认 7 天）
    - 根据目录的最后修改时间（mtime）判断
    
    Returns:
        {
            'success': bool,
            'scanned_count': int,      # 扫描的目录数
            'cleaned_count': int,       # 成功清理的目录数
            'failed_count': int,        # 清理失败的目录数
            'skipped_count': int,       # 跳过的目录数
            'freed_space_mb': float,    # 释放的磁盘空间（MB，估算）
            'details': list             # 清理详情
        }
    
    Note:
        - 此任务由 Celery Beat 定时调度（默认每天凌晨执行）
        - 只扫描 SCAN_RESULTS_DIR 目录下的一级子目录
        - 不涉及数据库操作，纯文件系统清理
    """
    logger.info("="*60)
    logger.info("开始定时清理扫描结果 - Task ID: %s", self.request.id)
    logger.info("="*60)
    
    try:
        # 1. 获取扫描结果根目录
        scan_results_dir = _get_scan_results_dir()
        if not scan_results_dir:
            error_msg = "未配置 SCAN_RESULTS_DIR 环境变量"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        
        # 2. 读取保留天数配置
        retention_days = _get_retention_policy()
        logger.info("清理策略: 保留 %d 天, 目录: %s", retention_days, scan_results_dir)
        
        # 3. 查找需要清理的目录
        dirs_to_cleanup = _find_directories_to_cleanup(scan_results_dir, retention_days)
        scanned_count = len(dirs_to_cleanup)
        
        if scanned_count == 0:
            logger.info("没有需要清理的目录")
            return {
                'success': True,
                'scanned_count': 0,
                'cleaned_count': 0,
                'failed_count': 0,
                'skipped_count': 0,
                'freed_space_mb': 0.0,
                'details': []
            }
        
        logger.info("找到 %d 个需要清理的目录", scanned_count)
        
        # 4. 执行清理
        cleaned_count = 0
        failed_count = 0
        skipped_count = 0
        freed_space_mb = 0.0
        details = []
        
        for dir_info in dirs_to_cleanup:
            result = _cleanup_directory(dir_info)
            
            if result['success']:
                cleaned_count += 1
                freed_space_mb += result['freed_space_mb']
            elif result.get('skipped'):
                skipped_count += 1
            else:
                failed_count += 1
            
            details.append(result)
        
        # 5. 记录统计
        logger.info("="*60)
        logger.info(
            "✓ 清理完成 - 扫描: %d, 成功: %d, 失败: %d, 跳过: %d, 释放空间: %.2f MB",
            scanned_count, cleaned_count, failed_count, skipped_count, freed_space_mb
        )
        logger.info("="*60)
        
        return {
            'success': True,
            'scanned_count': scanned_count,
            'cleaned_count': cleaned_count,
            'failed_count': failed_count,
            'skipped_count': skipped_count,
            'freed_space_mb': round(freed_space_mb, 2),
            'details': details
        }
        
    except Exception as e:  # noqa: BLE001
        logger.exception("定时清理任务失败: %s", e)
        return {
            'success': False,
            'error': str(e)
        }


def _get_scan_results_dir() -> str | None:
    """
    获取扫描结果根目录
    
    Returns:
        扫描结果根目录路径，如果未配置则返回 None
    """
    # 从 settings 获取，保持配置统一
    scan_dir = getattr(settings, 'SCAN_RESULTS_DIR', None)
    if not scan_dir:
        return None
    
    # 验证目录是否存在
    if not os.path.isdir(scan_dir):
        logger.warning("SCAN_RESULTS_DIR 目录不存在: %s", scan_dir)
        return None
    
    return scan_dir


def _get_retention_policy() -> int:
    """
    获取清理策略配置
    
    Returns:
        保留天数（int）
    """
    # 从 settings 读取配置，提供默认值
    return getattr(settings, 'SCAN_RESULTS_RETENTION_DAYS', 7)


def _find_directories_to_cleanup(base_dir: str, retention_days: int) -> list:
    """
    查找需要清理的目录
    
    Args:
        base_dir: 扫描结果根目录
        retention_days: 保留天数
    
    Returns:
        需要清理的目录信息列表
        [
            {
                'path': str,           # 目录完整路径
                'name': str,           # 目录名称
                'mtime': float,        # 修改时间戳
                'age_days': int        # 已存在天数
            },
            ...
        ]
    """
    now = time.time()
    cutoff_timestamp = now - (retention_days * 24 * 3600)
    
    logger.debug(
        "清理策略 - 保留 %d 天（截止时间戳: %s）",
        retention_days, cutoff_timestamp
    )
    
    dirs_to_cleanup = []
    
    try:
        base_path = Path(base_dir)
        
        # 遍历一级子目录
        for item in base_path.iterdir():
            # 只处理目录，跳过文件
            if not item.is_dir():
                continue
            
            try:
                # 获取目录的修改时间
                mtime = item.stat().st_mtime
                age_seconds = now - mtime
                age_days = int(age_seconds / (24 * 3600))
                
                # 判断是否超过保留期限
                if mtime < cutoff_timestamp:
                    dirs_to_cleanup.append({
                        'path': str(item),
                        'name': item.name,
                        'mtime': mtime,
                        'age_days': age_days
                    })
                    logger.debug(
                        "发现过期目录 - %s (已存在 %d 天)",
                        item.name, age_days
                    )
                else:
                    logger.debug(
                        "保留目录 - %s (已存在 %d 天)",
                        item.name, age_days
                    )
                    
            except OSError as e:
                logger.warning(
                    "无法获取目录信息，跳过 - %s: %s",
                    item.name, e
                )
                continue
        
        # 按修改时间排序（从旧到新）
        dirs_to_cleanup.sort(key=lambda x: x['mtime'])
        
    except OSError as e:
        logger.error("扫描目录失败 - %s: %s", base_dir, e)
    
    return dirs_to_cleanup


def _cleanup_directory(dir_info: dict) -> dict:
    """
    清理单个目录
    
    Args:
        dir_info: 目录信息字典
    
    Returns:
        {
            'success': bool,
            'path': str,
            'name': str,
            'age_days': int,
            'freed_space_mb': float,
            'skipped': bool (可选),
            'error': str (if failed)
        }
    """
    dir_path = dir_info['path']
    dir_name = dir_info['name']
    age_days = dir_info['age_days']
    
    try:
        # 检查目录是否仍然存在
        path_obj = Path(dir_path)
        
        if not path_obj.exists():
            logger.debug("目录不存在，跳过 - %s", dir_name)
            return {
                'success': True,
                'skipped': True,
                'path': dir_path,
                'name': dir_name,
                'age_days': age_days,
                'freed_space_mb': 0.0,
                'message': 'Directory not found'
            }
        
        # 计算目录大小（估算）
        try:
            size_bytes = sum(
                f.stat().st_size for f in path_obj.rglob('*') if f.is_file()
            )
            size_mb = size_bytes / (1024 * 1024)
        except Exception as e:  # noqa: BLE001
            logger.warning("无法计算目录大小 - %s: %s", dir_name, e)
            size_mb = 0.0
        
        # 删除目录
        if remove_directory(dir_path):
            logger.info(
                "✓ 清理成功 - %s (已存在 %d 天, 空间: %.2f MB)",
                dir_name, age_days, size_mb
            )
            return {
                'success': True,
                'path': dir_path,
                'name': dir_name,
                'age_days': age_days,
                'freed_space_mb': size_mb
            }
        else:
            logger.warning("清理失败 - %s", dir_name)
            return {
                'success': False,
                'path': dir_path,
                'name': dir_name,
                'age_days': age_days,
                'freed_space_mb': 0.0,
                'error': 'Failed to remove directory'
            }
        
    except Exception as e:  # noqa: BLE001
        logger.exception("清理目录异常 - %s: %s", dir_name, e)
        return {
            'success': False,
            'path': dir_path,
            'name': dir_name,
            'age_days': age_days,
            'freed_space_mb': 0.0,
            'error': str(e)
        }


# 导出接口
__all__ = ['cleanup_old_scans_task']

