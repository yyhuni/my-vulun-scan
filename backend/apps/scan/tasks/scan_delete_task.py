"""
Scan 硬删除任务

使用 Prefect Task 封装 Scan 的硬删除逻辑
"""

import logging
from prefect import task
from apps.scan.repositories import DjangoScanRepository

logger = logging.getLogger(__name__)


@task(
    name="hard-delete-scan",
    retries=3,
    retry_delay_seconds=5
)
def hard_delete_scan_task(scan_id: int, scan_name: str) -> dict:
    """
    硬删除单个 Scan 的 Prefect Task
    
    Args:
        scan_id: Scan ID
        scan_name: Scan 名称（用于日志）
    
    Returns:
        删除结果字典
    """
    logger.info(f"🗑️ 开始硬删除 Scan: {scan_name} (ID: {scan_id})")
    
    try:
        repo = DjangoScanRepository()
        # 使用 hard_delete_by_ids 删除单个记录
        count, details = repo.hard_delete_by_ids([scan_id])
        
        if count > 0:
            logger.info(f"✅ Scan 硬删除成功: {scan_name} (ID: {scan_id})")
            return {
                'success': True,
                'scan_id': scan_id,
                'scan_name': scan_name,
                'deleted_count': count,
                'details': details
            }
        else:
            logger.warning(f"⚠️ Scan 硬删除未找到记录 (可能已删除): {scan_name} (ID: {scan_id})")
            return {
                'success': True, # 视为成功
                'scan_id': scan_id,
                'scan_name': scan_name,
                'deleted_count': 0,
                'message': 'Record not found or already deleted'
            }
            
    except Exception as e:
        logger.error(f"❌ Scan 硬删除失败: {scan_name} (ID: {scan_id}) - {e}")
        return {
            'success': False,
            'scan_id': scan_id,
            'scan_name': scan_name,
            'error': str(e)
        }
