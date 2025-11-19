"""
目录删除流程

使用 Prefect 编排目录的批量删除流程
"""

import logging
from typing import List

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from apps.asset.tasks.directory_delete_task import hard_delete_directory_task

logger = logging.getLogger(__name__)


@flow(
    name="delete-directories",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
def delete_directories_flow(
    directory_ids: List[int],
    directory_names: List[str]
) -> dict:
    """
    批量删除目录的 Prefect Flow
    
    Args:
        directory_ids: 目录 ID 列表
        directory_names: 目录名称列表
    
    Returns:
        删除结果统计
    """
    logger.info(f"🚀 开始批量删除目录 Flow - 总数: {len(directory_ids)}")
    
    results = []
    successful = 0
    failed = 0
    
    for directory_id, directory_name in zip(directory_ids, directory_names):
        try:
            result = hard_delete_directory_task.submit(
                directory_id=directory_id,
                directory_name=directory_name
            )
            
            task_result = result.result()
            
            if task_result.get('success'):
                successful += 1
            else:
                failed += 1
            
            results.append(task_result)
            
        except Exception as e:
            logger.error(f"❌ 删除目录失败: {directory_name} (ID: {directory_id}) - {e}")
            failed += 1
            results.append({
                'success': False,
                'directory_id': directory_id,
                'directory_name': directory_name,
                'error': str(e)
            })
    
    summary = {
        'total': len(directory_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(
        f"✓ 批量删除目录完成 - "
        f"总数: {summary['total']}, "
        f"成功: {summary['successful']}, "
        f"失败: {summary['failed']}"
    )
    
    return summary


__all__ = ['delete_directories_flow']
