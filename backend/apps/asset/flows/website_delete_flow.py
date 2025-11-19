"""
网站删除流程

使用 Prefect 编排网站的批量删除流程
"""

import logging
from typing import List

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from apps.asset.tasks.website_delete_task import hard_delete_website_task

logger = logging.getLogger(__name__)


@flow(
    name="delete-websites",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
def delete_websites_flow(
    website_ids: List[int],
    website_names: List[str]
) -> dict:
    """
    批量删除网站的 Prefect Flow
    
    Args:
        website_ids: 网站 ID 列表
        website_names: 网站名称列表
    
    Returns:
        删除结果统计
    """
    logger.info(f"🚀 开始批量删除网站 Flow - 总数: {len(website_ids)}")
    
    results = []
    successful = 0
    failed = 0
    
    for website_id, website_name in zip(website_ids, website_names):
        try:
            result = hard_delete_website_task.submit(
                website_id=website_id,
                website_name=website_name
            )
            
            task_result = result.result()
            
            if task_result.get('success'):
                successful += 1
            else:
                failed += 1
            
            results.append(task_result)
            
        except Exception as e:
            logger.error(f"❌ 删除网站失败: {website_name} (ID: {website_id}) - {e}")
            failed += 1
            results.append({
                'success': False,
                'website_id': website_id,
                'website_name': website_name,
                'error': str(e)
            })
    
    summary = {
        'total': len(website_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(
        f"✓ 批量删除网站完成 - "
        f"总数: {summary['total']}, "
        f"成功: {summary['successful']}, "
        f"失败: {summary['failed']}"
    )
    
    return summary


__all__ = ['delete_websites_flow']
