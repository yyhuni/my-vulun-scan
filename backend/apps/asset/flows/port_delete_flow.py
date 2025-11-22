"""
端口删除流程

使用 Prefect 编排端口的批量删除流程
"""

import logging
from typing import List

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from apps.asset.tasks.asset.port_delete_task import hard_delete_port_task

logger = logging.getLogger(__name__)


@flow(
    name="delete-ports",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
def delete_ports_flow(
    port_ids: List[int],
    port_names: List[str]
) -> dict:
    """
    批量删除端口的 Prefect Flow
    
    Args:
        port_ids: 端口 ID 列表
        port_names: 端口名称列表
    
    Returns:
        删除结果统计
    """
    logger.info(f"🚀 开始批量删除端口 Flow - 总数: {len(port_ids)}")
    
    results = []
    successful = 0
    failed = 0
    
    for port_id, port_name in zip(port_ids, port_names):
        try:
            result = hard_delete_port_task.submit(
                port_id=port_id,
                port_name=port_name
            )
            
            task_result = result.result()
            
            if task_result.get('success'):
                successful += 1
            else:
                failed += 1
            
            results.append(task_result)
            
        except Exception as e:
            logger.error(f"❌ 删除端口失败: {port_name} (ID: {port_id}) - {e}")
            failed += 1
            results.append({
                'success': False,
                'port_id': port_id,
                'port_name': port_name,
                'error': str(e)
            })
    
    summary = {
        'total': len(port_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(
        f"✓ 批量删除端口完成 - "
        f"总数: {summary['total']}, "
        f"成功: {summary['successful']}, "
        f"失败: {summary['failed']}"
    )
    
    return summary


__all__ = ['delete_ports_flow']
