from apps.engine.models import ScanEngine
import logging

logger = logging.getLogger(__name__)


def initiate_scan(target: str, engine: ScanEngine):
    """
    初始化扫描任务
    """
    logger.info("初始化扫描任务: %s, %s", target, engine)
    # TODO: 实现扫描任务的具体逻辑