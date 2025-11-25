"""
目标删除 Flow

负责编排目标删除的完整流程
"""

import logging
from typing import List, Dict

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow

logger = logging.getLogger(__name__)


@flow(name="delete-targets", log_prints=True)
def delete_targets_flow(target_ids: List[int]) -> Dict:
    """
    批量删除目标 Flow
    
    Args:
        target_ids: 目标 ID 列表
    
    Returns:
        删除结果统计 {
            'success': bool,
            'total': int,
            'success_count': int,
            'failed_count': int,
            'total_deleted_records': int,
            'results': list
        }
    
    特点：
    - 逐个删除目标，避免资源耗尽
    - Prefect自动管理任务调度和并发
    - 完整的结果统计
    
    Note:
        - 此Flow由Prefect调度执行
        - 可在Prefect UI查看执行进度和日志
    """
    from apps.targets.tasks.target_delete_task import hard_delete_target_task
    
    logger.info("="*60)
    logger.info(f"开始批量删除目标")
    logger.info(f"  数量: {len(target_ids)}")
    logger.info("="*60)
    
    futures = []
    
    # 提交所有删除任务
    for target_id in target_ids:
        future = hard_delete_target_task.submit(target_id=target_id)
        futures.append((target_id, future))
    
    # 收集结果
    results = []
    success_count = 0
    failed_count = 0
    total_deleted = 0
    
    for target_id, future in futures:
        try:
            result = future.result()  # 等待 Future 完成并获取结果
            results.append(result)
            success_count += 1
            total_deleted += result.get('deleted_count', 0)
        except Exception as e:
            logger.error(f"❌ 删除目标失败 (ID: {target_id}) - {e}")
            failed_count += 1
            results.append({
                'success': False,
                'target_id': target_id,
                'error': str(e)
            })
    
    # 汇总结果
    summary = {
        'success': failed_count == 0,
        'total': len(target_ids),
        'success_count': success_count,
        'failed_count': failed_count,
        'total_deleted_records': total_deleted,
        'results': results
    }
    
    logger.info("="*60)
    logger.info(
        f"✓ 批量删除完成 - 成功: {success_count}/{len(target_ids)}, "
        f"失败: {failed_count}, 总删除: {total_deleted:,} 条记录"
    )
    logger.info("="*60)
    
    return summary


# 导出接口
__all__ = ['delete_targets_flow']
