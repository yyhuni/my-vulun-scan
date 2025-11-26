"""
定时扫描 Flow

接收定时扫描参数，调用 ScanCreationService 创建和启动扫描任务
"""

# Django 环境初始化
from apps.common.prefect_django_setup import setup_django_for_prefect

from prefect import flow
import logging

logger = logging.getLogger(__name__)


@flow(
    name='scheduled_scan',
    description='定时扫描任务 - 批量启动扫描',
    log_prints=True,
)
def scheduled_scan_flow(
    scheduled_scan_id: int,
    target_ids: list,
    engine_id: int,
) -> dict:
    """
    定时扫描 Flow
    
    接收定时扫描参数，为每个目标创建并启动扫描任务
    
    Args:
        scheduled_scan_id: 定时扫描任务 ID
        target_ids: 目标 ID 列表
        engine_id: 扫描引擎 ID
    
    Returns:
        dict: 执行结果
    """
    from apps.scan.services.scan_creation_service import ScanCreationService
    from apps.scan.services.scheduled_scan_service import ScheduledScanService
    from apps.engine.repositories import DjangoEngineRepository
    from apps.targets.repositories import DjangoTargetRepository
    
    logger.info(
        "="*60 + "\n" +
        "开始执行定时扫描\n" +
        f"  Scheduled Scan ID: {scheduled_scan_id}\n" +
        f"  Target IDs: {target_ids}\n" +
        f"  Engine ID: {engine_id}\n" +
        "="*60
    )
    
    try:
        # 1. 通过 Repository 获取引擎
        engine_repo = DjangoEngineRepository()
        engine = engine_repo.get_by_id(engine_id)
        
        if not engine:
            logger.error("扫描引擎不存在: %s", engine_id)
            return {
                'success': False,
                'scheduled_scan_id': scheduled_scan_id,
                'message': f'扫描引擎 {engine_id} 不存在',
            }
        
        # 2. 通过 Repository 获取目标列表
        target_repo = DjangoTargetRepository()
        targets = target_repo.get_by_ids(target_ids)
        
        if not targets:
            logger.warning("没有找到有效的扫描目标")
            return {
                'success': False,
                'scheduled_scan_id': scheduled_scan_id,
                'message': '没有找到有效的扫描目标',
                'scan_count': 0,
            }
        
        # 3. 使用 ScanCreationService 创建并启动扫描
        creation_service = ScanCreationService()
        created_scans = creation_service.create_scans(targets, engine)
        
        # 4. 通过 Service 更新定时扫描的执行统计
        try:
            scheduled_scan_service = ScheduledScanService()
            scheduled_scan_service.record_run(scheduled_scan_id)
        except Exception as e:
            logger.warning("更新定时扫描统计失败: %s", e)
        
        logger.info(
            "="*60 + "\n" +
            "✓ 定时扫描执行完成\n" +
            f"  创建扫描数: {len(created_scans)}\n" +
            "="*60
        )
        
        return {
            'success': True,
            'scheduled_scan_id': scheduled_scan_id,
            'scan_count': len(created_scans),
            'scan_ids': [s.id for s in created_scans],
        }
        
    except Exception as e:
        logger.exception("定时扫描执行失败: %s", e)
        return {
            'success': False,
            'scheduled_scan_id': scheduled_scan_id,
            'message': str(e),
        }
