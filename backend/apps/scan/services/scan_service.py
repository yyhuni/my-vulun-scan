"""
扫描任务服务

负责扫描任务的业务逻辑编排
"""

import logging
from typing import List
from django.db import transaction

from apps.scan.models import Scan
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.scan.tasks.initiate_scan import initiate_scan

logger = logging.getLogger(__name__)


class ScanService:
    """扫描任务服务"""
    
    @transaction.atomic
    def create_scan(
        self,
        target: Target,
        engine: ScanEngine
    ) -> Scan:
        """
        创建单个扫描任务并自动启动
        
        Args:
            target: 目标对象
            engine: 扫描引擎对象
        
        Returns:
            创建的 Scan 对象
        
        Raises:
            Exception: 创建或启动失败时抛出异常
        """
        # 创建扫描任务记录
        scan = Scan.objects.create(  # type: ignore
            target=target,
            engine=engine,
        )
        
        logger.info(
            "创建扫描任务 - Scan ID: %s, Target: %s, Engine: %s",
            scan.id,
            target.name,
            engine.name
        )
        
        # 启动扫描任务（异步）
        # 如果失败会抛出异常，事务会自动回滚
        result = initiate_scan.delay(
            scan_id=scan.id,
            engine_id=scan.engine.id
        )
        
        logger.info(
            "扫描任务已提交 - Scan ID: %s, Task ID: %s",
            scan.id,
            result.id
        )
        
        return scan
    
    def create_scans_for_targets(
        self,
        targets: List[Target],
        engine: ScanEngine
    ) -> List[Scan]:
        """
        为多个目标批量创建扫描任务并自动启动
        
        Args:
            targets: 目标列表
            engine: 扫描引擎对象
        
        Returns:
            创建的 Scan 对象列表
        """
        scans = []
        
        for target in targets:
            try:
                scan = self.create_scan(target=target, engine=engine)
                scans.append(scan)
            except Exception as e:
                logger.error(
                    "创建扫描任务失败 - Target: %s, Engine: %s, 错误: %s",
                    target.name,
                    engine.name,
                    e,
                    exc_info=True
                )
                # 继续处理其他目标，不中断批量操作
                continue
        
        logger.info(
            "批量创建扫描任务完成 - 成功: %d/%d",
            len(scans),
            len(targets)
        )
        
        return scans


# 导出接口
__all__ = ['ScanService']
