"""
扫描完成任务模块

负责在所有子任务完成后统一更新 Scan 状态

队列策略：
- 使用 orchestrator 队列（轻量级、高并发）
- 特点：CPU 密集型、执行快（<1秒）
- Worker 配置建议：高并发（-c 50）
"""

import logging

from celery import shared_task

from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


@shared_task(name='finalize_scan', bind=True)
def finalize_scan_task(self, scan_id: int = None) -> dict:
    """
    完成扫描任务
    
    职责：
    - 统计所有子任务的状态
    - 决定 Scan 的最终状态
    - 更新 Scan 状态为最终状态
    
    Args:
        self: Celery task instance（由 bind=True 提供）
        scan_id: 扫描 ID（关键字参数，便于信号处理器统一获取）
    
    Returns:
        {
            'scan_id': int,
            'final_status': str,
            'message': str,
            'summary': dict  # 任务统计信息
        }
    
    Note:
        - 使用 .si() 签名，不接收前面任务的返回值
        - 通过查询 ScanTask 表来获取所有任务的状态
        - 排除编排任务和收尾任务自身（initiate_scan, finalize_scan）
    
    状态决策逻辑：
        - 如果有任务被中止（ABORTED）→ Scan = ABORTED
        - 如果有任务失败（FAILED）→ Scan = FAILED
        - 如果所有任务成功（SUCCESSFUL）→ Scan = SUCCESSFUL
    """
    # 参数验证
    if not scan_id:
        raise ValueError("scan_id is required")
    
    logger.info("="*60)
    logger.info("开始完成扫描 - Scan ID: %s", scan_id)
    logger.info("="*60)
    
    # 延迟导入避免循环依赖
    from apps.scan.services import ScanService, ScanTaskService
    
    scan_service = ScanService()
    task_service = ScanTaskService()
    
    # 1. 获取所有子任务的状态统计（排除编排任务和收尾任务）
    try:
        stats = task_service.get_task_stats(
            scan_id,
            exclude_tasks=['initiate_scan', 'finalize_scan']
        )
        
        logger.info("任务统计: %s", stats)
        
    except Exception as e:
        logger.exception("获取任务统计失败 - Scan ID: %s, 错误: %s", scan_id, e)
        # 如果统计失败，默认为失败状态
        stats = {'total': 0, 'successful': 0, 'failed': 1, 'aborted': 0}
    
    # 2. 决定最终状态
    aborted_count = stats.get('aborted', 0)
    failed_count = stats.get('failed', 0)
    successful_count = stats.get('successful', 0)
    total_count = stats.get('total', 0)
    
    if total_count == 0:
        # 没有子任务，可能配置错误
        final_status = ScanTaskStatus.FAILED
        message = "扫描失败 - 没有执行任何子任务"
        logger.warning(message)
        
    elif aborted_count > 0:
        # 有任务被中止
        final_status = ScanTaskStatus.ABORTED
        message = (
            f"扫描被中止 - "
            f"成功: {successful_count}, "
            f"失败: {failed_count}, "
            f"中止: {aborted_count}"
        )
        logger.warning(message)
        
    elif failed_count > 0:
        # 有任务失败
        final_status = ScanTaskStatus.FAILED
        message = (
            f"扫描失败 - "
            f"成功: {successful_count}, "
            f"失败: {failed_count}"
        )
        logger.warning(message)
        
    else:
        # 所有任务成功
        final_status = ScanTaskStatus.SUCCESSFUL
        message = f"扫描成功 - 完成: {successful_count} 个任务"
        logger.info(message)
    
    # 3. 更新 Scan 状态
    try:
        scan_service.complete_scan(scan_id, final_status)
        logger.info("="*60)
        logger.info("✓ 扫描完成 - Scan ID: %s, 状态: %s", scan_id, final_status.label)
        logger.info("="*60)
        
    except Exception as e:
        logger.exception("更新 Scan 状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
        raise
    
    # 4. 返回结果
    return {
        'scan_id': scan_id,
        'final_status': final_status.value,
        'message': message,
        'summary': stats
    }


# 导出接口
__all__ = ['finalize_scan_task']

