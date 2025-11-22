"""
子域名删除流程

使用 Prefect 编排子域名的批量删除流程
"""

import logging
from typing import List

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from apps.asset.tasks.asset.subdomain_delete_task import hard_delete_subdomain_task

logger = logging.getLogger(__name__)


@flow(
    name="delete-subdomains",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
def delete_subdomains_flow(subdomain_ids: List[int]) -> dict:
    """
    批量删除子域名的 Prefect Flow
    
    Args:
        subdomain_ids: 子域名 ID 列表
    
    Returns:
        {
            'total': int,              # 总数
            'successful': int,          # 成功数
            'failed': int,              # 失败数
            'results': List[dict]       # 详细结果
        }
    
    Strategy:
        - 使用 ConcurrentTaskRunner 并发执行删除任务
        - 每个子域名作为独立的 Task 执行
        - 失败的任务会自动重试
    
    Note:
        - 此 Flow 由 Deployment 触发
        - 可在 Prefect UI 查看执行状态
    """
    logger.info(f"🚀 开始批量删除子域名 Flow - 总数: {len(subdomain_ids)}")
    
    results = []
    successful = 0
    failed = 0
    
    # 为每个子域名创建并发任务
    for subdomain_id in subdomain_ids:
        try:
            # 提交删除任务（异步执行）
            result = hard_delete_subdomain_task.submit(subdomain_id=subdomain_id)
            
            # 等待任务完成并获取结果
            task_result = result.result()
            
            if task_result.get('success'):
                successful += 1
            else:
                failed += 1
            
            results.append(task_result)
            
        except Exception as e:
            logger.error(f"❌ 删除子域名失败 (ID: {subdomain_id}) - {e}")
            failed += 1
            results.append({
                'success': False,
                'subdomain_id': subdomain_id,
                'error': str(e)
            })
    
    summary = {
        'total': len(subdomain_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(
        f"✓ 批量删除子域名完成 - "
        f"总数: {summary['total']}, "
        f"成功: {summary['successful']}, "
        f"失败: {summary['failed']}"
    )
    
    return summary


__all__ = ['delete_subdomains_flow']
