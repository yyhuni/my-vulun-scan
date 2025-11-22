"""
组织删除 Flow

负责编排组织删除的完整流程
"""

import logging
from typing import List, Dict

# Django 环境初始化（导入即生效）
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow

logger = logging.getLogger(__name__)


@flow(name="delete-organizations", log_prints=True)
def delete_organizations_flow(organization_ids: List[int]) -> Dict:
    """
    批量删除组织 Flow
    
    Args:
        organization_ids: 组织 ID 列表
    
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
    - 逐个删除组织，避免资源耗尽
    - Prefect自动管理任务调度和并发
    - 完整的结果统计
    
    Note:
        - 此Flow由Prefect调度执行
        - 可在Prefect UI查看执行进度和日志
    """
    from apps.targets.tasks.organization_delete_task import hard_delete_organization_task
    
    logger.info("="*60)
    logger.info(f"开始批量删除组织")
    logger.info(f"  数量: {len(organization_ids)}")
    logger.info("="*60)
    
    results = []
    success_count = 0
    failed_count = 0
    total_deleted = 0
    
    # 逐个删除组织（Prefect Task自动管理重试和错误处理）
    for organization_id in organization_ids:
        try:
            result = hard_delete_organization_task.submit(organization_id=organization_id)
            results.append(result)
            success_count += 1
            total_deleted += result['deleted_count']
            
        except Exception as e:
            logger.error(f"❌ 删除组织失败 (ID: {organization_id}) - {e}")
            failed_count += 1
            results.append({
                'success': False,
                'organization_id': organization_id,
                'error': str(e)
            })
    
    # 汇总结果
    summary = {
        'success': failed_count == 0,
        'total': len(organization_ids),
        'success_count': success_count,
        'failed_count': failed_count,
        'total_deleted_records': total_deleted,
        'results': results
    }
    
    logger.info("="*60)
    logger.info(
        f"✓ 批量删除完成 - 成功: {success_count}/{len(organization_ids)}, "
        f"失败: {failed_count}, 总删除: {total_deleted:,} 条记录"
    )
    logger.info("="*60)
    
    return summary


# 导出接口
__all__ = ['delete_organizations_flow']
