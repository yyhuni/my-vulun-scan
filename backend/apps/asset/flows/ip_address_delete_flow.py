"""
IP地址删除流程

使用 Prefect 编排IP地址的批量删除流程
"""

import logging
from typing import List

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from apps.asset.tasks.ip_address_delete_task import hard_delete_ip_address_task

logger = logging.getLogger(__name__)


@flow(
    name="delete-ip-addresses",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
def delete_ip_addresses_flow(
    ip_address_ids: List[int],
    ip_address_names: List[str]
) -> dict:
    """
    批量删除IP地址的 Prefect Flow
    
    Args:
        ip_address_ids: IP地址 ID 列表
        ip_address_names: IP地址名称列表
    
    Returns:
        删除结果统计
    """
    logger.info(f"🚀 开始批量删除IP地址 Flow - 总数: {len(ip_address_ids)}")
    
    results = []
    successful = 0
    failed = 0
    
    for ip_address_id, ip_address_name in zip(ip_address_ids, ip_address_names):
        try:
            result = hard_delete_ip_address_task.submit(
                ip_address_id=ip_address_id,
                ip_address_name=ip_address_name
            )
            
            task_result = result.result()
            
            if task_result.get('success'):
                successful += 1
            else:
                failed += 1
            
            results.append(task_result)
            
        except Exception as e:
            logger.error(f"❌ 删除IP地址失败: {ip_address_name} (ID: {ip_address_id}) - {e}")
            failed += 1
            results.append({
                'success': False,
                'ip_address_id': ip_address_id,
                'ip_address_name': ip_address_name,
                'error': str(e)
            })
    
    summary = {
        'total': len(ip_address_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(
        f"✓ 批量删除IP地址完成 - "
        f"总数: {summary['total']}, "
        f"成功: {summary['successful']}, "
        f"失败: {summary['failed']}"
    )
    
    return summary


__all__ = ['delete_ip_addresses_flow']
