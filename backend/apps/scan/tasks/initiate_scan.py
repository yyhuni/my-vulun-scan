from celery import shared_task
from apps.scan.models import Scan
from apps.common.definitions import CeleryTaskStatus
from pathlib import Path
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)


@shared_task(name='initiate_scan', queue='main_scan_queue', bind=True)
def initiate_scan(self, scan_id: int, engine_id: int):
    """
    初始化扫描任务
    
    Args:
        self: Celery task instance (由 bind=True 提供)
        scan_id: Scan 对象的 ID
        engine_id: 扫描引擎 ID
    """
    try:
        # 获取 Scan 对象
        scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
        
        # 生成时间戳和扫描结果目录
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_dir = os.getenv('SCAN_RESULTS_DIR')
        results_dir = Path(base_dir) / f"task_{timestamp}"
        
        # 创建扫描结果目录
        try:
            results_dir.mkdir(parents=True, exist_ok=True)
            logger.info("创建扫描结果目录: %s", results_dir)
        except OSError as e:
            logger.error("创建目录失败: %s - %s", results_dir, e)
            raise
        
        # 更新 Scan 对象
        scan.results_dir = str(results_dir)
        scan.task_ids = [self.request.id] if self.request.id else []
        scan.task_names = [self.request.task] if self.request.task else []
        scan.status = CeleryTaskStatus.RUNNING
        scan.save()
        
        logger.info(
            "初始化扫描任务 - Scan ID: %s, Target: %s, Engine ID: %s, Task ID: %s, Results Dir: %s",
            scan_id, scan.target.name, engine_id, self.request.id, results_dir
        )
        
    # TODO: 实现扫描任务的具体逻辑
        
    except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
        logger.error("Scan with ID %s does not exist", scan_id)
        raise
    except Exception as e:  # noqa: BLE001
        logger.exception("Failed to initiate scan: %s", e)
        # 更新 Scan 状态为失败
        try:
            scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
            scan.status = CeleryTaskStatus.FAILED
            scan.error_message = str(e)[:300]
            scan.save()
        except Exception:  # noqa: BLE001
            pass
        raise