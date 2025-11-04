"""
扫描任务服务

负责扫描任务的业务逻辑编排
"""

import logging
from typing import List, Optional
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
        engine: ScanEngine,
        auto_start: bool = True
    ) -> Scan:
        """
        创建单个扫描任务
        
        Args:
            target: 目标对象
            engine: 扫描引擎对象
            auto_start: 是否自动启动扫描（默认 True）
        
        Returns:
            创建的 Scan 对象
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
        
        # 自动启动扫描
        if auto_start:
            self.start_scan(scan)
        
        return scan
    
    def create_scans_for_targets(
        self,
        targets: List[Target],
        engine: ScanEngine,
        auto_start: bool = True
    ) -> List[Scan]:
        """
        为多个目标批量创建扫描任务
        
        Args:
            targets: 目标列表
            engine: 扫描引擎对象
            auto_start: 是否自动启动扫描（默认 True）
        
        Returns:
            创建的 Scan 对象列表
        """
        scans = []
        
        for target in targets:
            try:
                scan = self.create_scan(
                    target=target,
                    engine=engine,
                    auto_start=auto_start
                )
                scans.append(scan)
            except Exception as e:
                logger.error(
                    "创建扫描任务失败 - Target: %s, 错误: %s",
                    target.name,
                    e
                )
                # 继续处理其他目标
                continue
        
        logger.info(
            "批量创建扫描任务完成 - 成功: %d/%d",
            len(scans),
            len(targets)
        )
        
        return scans
    
    def start_scan(self, scan: Scan) -> bool:
        """
        启动扫描任务（异步）
        
        Args:
            scan: Scan 对象
        
        Returns:
            是否成功提交任务
        """
        try:
            # 调用 Celery 异步任务
            # 任务会自动更新 task_ids 和 task_names
            result = initiate_scan.delay(
                scan_id=scan.id,
                engine_id=scan.engine.id
            )
            
            logger.info(
                "扫描任务已提交 - Scan ID: %s, Task ID: %s",
                scan.id,
                result.id
            )
            
            return True
            
        except Exception as e:
            logger.error(
                "提交扫描任务失败 - Scan ID: %s, 错误: %s",
                scan.id,
                e
            )
            return False
    
    def cancel_scan(self, scan_id: int) -> bool:
        """
        取消扫描任务
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否成功取消
        """
        # TODO: 实现取消逻辑
        # 1. 撤销 Celery 任务
        # 2. 更新 Scan 状态为 ABORTED
        pass
    
    def get_scan_progress(self, scan_id: int) -> Optional[dict]:
        """
        获取扫描进度
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            进度信息字典
        """
        # TODO: 实现进度查询逻辑
        pass


# 导出接口
__all__ = ['ScanService']
