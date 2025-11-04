"""
扫描任务服务

负责扫描任务的业务逻辑编排
"""

import logging
import os
from typing import List
from datetime import datetime
from pathlib import Path
from django.db import transaction

from apps.scan.models import Scan
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.scan.tasks.initiate_scan_task import initiate_scan_task

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
        # 生成工作空间目录路径
        # 职责：Service 层负责业务逻辑和数据准备
        results_dir = self._generate_workspace_path()
        
        # 创建扫描任务记录
        scan = Scan.objects.create(  # type: ignore
            target=target,
            engine=engine,
            results_dir=results_dir,
        )
        
        logger.info(
            "创建扫描任务 - Scan ID: %s, Target: %s, Engine: %s, Workspace: %s",
            scan.id,
            target.name,
            engine.name,
            results_dir
        )
        
        # 启动扫描任务（异步）
        # 如果失败会抛出异常，事务会自动回滚
        result = initiate_scan_task.delay(scan_id=scan.id)
        
        logger.info(
            "扫描任务已提交 - Scan ID: %s, Task ID: %s",
            scan.id,
            result.id
        )
        
        return scan
    
    def _generate_workspace_path(self) -> str:
        """
        生成工作空间目录路径
        
        职责：
        - 生成唯一的工作空间目录路径字符串
        - 不创建实际目录（由 task 层负责）
        
        Returns:
            工作空间目录路径字符串
        
        格式：{SCAN_RESULTS_DIR}/scan_{timestamp}/
        示例：/data/scans/scan_20231104_152030/
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_dir = os.getenv('SCAN_RESULTS_DIR')
        workspace_path = str(Path(base_dir) / f"scan_{timestamp}")
        return workspace_path
    
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
