"""
Scan 删除流程

使用 Prefect 编排 Scan 的批量删除流程
"""

import os
import sys
import logging
from typing import List

# 添加项目根目录到 Python 路径
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(current_dir, '../../..')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# 配置 Django（确保在 Prefect 执行环境中也能正常工作）
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from prefect import flow
from prefect.task_runners import ConcurrentTaskRunner

from apps.scan.tasks.scan_delete_task import hard_delete_scan_task

logger = logging.getLogger(__name__)


@flow(
    name="delete-scans",
    task_runner=ConcurrentTaskRunner(),
    log_prints=True
)
def delete_scans_flow(
    scan_ids: List[int],
    scan_names: List[str]
) -> dict:
    """
    批量删除 Scan 的 Prefect Flow
    
    Args:
        scan_ids: Scan ID 列表
        scan_names: Scan 名称列表
    
    Returns:
        删除结果统计
    """
    logger.info(f"🚀 开始批量删除 Scan Flow - 总数: {len(scan_ids)}")
    
    results = []
    successful = 0
    failed = 0
    
    for scan_id, scan_name in zip(scan_ids, scan_names):
        try:
            result = hard_delete_scan_task.submit(
                scan_id=scan_id,
                scan_name=scan_name
            )
            
            task_result = result.result()
            
            if task_result.get('success'):
                successful += 1
            else:
                failed += 1
            
            results.append(task_result)
            
        except Exception as e:
            logger.error(f"❌ 删除 Scan 失败: {scan_name} (ID: {scan_id}) - {e}")
            failed += 1
            results.append({
                'success': False,
                'scan_id': scan_id,
                'scan_name': scan_name,
                'error': str(e)
            })
    
    summary = {
        'total': len(scan_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }
    
    logger.info(
        f"✓ 批量删除 Scan 完成 - "
        f"总数: {summary['total']}, "
        f"成功: {summary['successful']}, "
        f"失败: {summary['failed']}"
    )
    
    return summary


__all__ = ['delete_scans_flow']
