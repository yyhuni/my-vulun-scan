"""
扫描任务服务

负责 Scan 模型的所有业务逻辑，协调各个子服务
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Dict, List

from apps.scan.models import Scan
from apps.scan.repositories import DjangoScanRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.common.definitions import ScanStatus

logger = logging.getLogger(__name__)


class ScanService:
    """
    扫描任务服务（协调者）

    职责：协调各个子服务，提供统一的公共接口
    """

    FINAL_STATUSES = {
        ScanStatus.COMPLETED,
        ScanStatus.FAILED,
        ScanStatus.CANCELLED
    }

    def __init__(self):
        from apps.scan.services.scan_creation_service import ScanCreationService
        from apps.scan.services.scan_state_service import ScanStateService
        from apps.scan.services.scan_control_service import ScanControlService
        from apps.scan.services.scan_stats_service import ScanStatsService

        self.creation_service = ScanCreationService()
        self.state_service = ScanStateService()
        self.control_service = ScanControlService()
        self.stats_service = ScanStatsService()
        self.scan_repo = DjangoScanRepository()

    def get_scan(self, scan_id: int, prefetch_relations: bool) -> Scan | None:
        """获取扫描任务（包含关联对象）"""
        return self.scan_repo.get_by_id(scan_id, prefetch_relations)

    def get_all_scans(self, prefetch_relations: bool = True):
        """获取所有扫描任务"""
        return self.scan_repo.get_all(prefetch_relations=prefetch_relations)

    def prepare_initiate_scan(
        self,
        organization_id: int | None = None,
        target_id: int | None = None,
        engine_id: int | None = None
    ) -> tuple[List[Target], ScanEngine]:
        """为创建扫描任务做准备，返回目标列表和扫描引擎"""
        return self.creation_service.prepare_initiate_scan(
            organization_id, target_id, engine_id
        )

    def prepare_initiate_scan_multi_engine(
        self,
        organization_id: int | None = None,
        target_id: int | None = None,
        engine_ids: List[int] | None = None
    ) -> tuple[List[Target], str, List[str], List[int]]:
        """为创建多引擎扫描任务做准备"""
        return self.creation_service.prepare_initiate_scan_multi_engine(
            organization_id, target_id, engine_ids
        )

    def create_scans(
        self,
        targets: List[Target],
        engine_ids: List[int],
        engine_names: List[str],
        yaml_configuration: str,
        scheduled_scan_name: str | None = None,
        scan_mode: str = 'full'
    ) -> List[Scan]:
        """批量创建扫描任务"""
        return self.creation_service.create_scans(
            targets, engine_ids, engine_names, yaml_configuration, scheduled_scan_name, scan_mode
        )

    # ==================== 状态管理方法 ====================

    def update_status(
        self,
        scan_id: int,
        status: ScanStatus,
        error_message: str | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """更新 Scan 状态"""
        return self.state_service.update_status(scan_id, status, error_message, stopped_at)

    def update_status_if_match(
        self,
        scan_id: int,
        current_status: ScanStatus,
        new_status: ScanStatus,
        stopped_at: datetime | None = None
    ) -> bool:
        """条件更新 Scan 状态"""
        return self.state_service.update_status_if_match(
            scan_id, current_status, new_status, stopped_at
        )

    def update_cached_stats(self, scan_id: int) -> dict | None:
        """更新缓存统计数据，返回统计数据字典"""
        return self.state_service.update_cached_stats(scan_id)

    # ==================== 进度跟踪方法 ====================

    def init_stage_progress(self, scan_id: int, stages: list[str]) -> bool:
        """初始化阶段进度"""
        return self.state_service.init_stage_progress(scan_id, stages)

    def start_stage(self, scan_id: int, stage: str) -> bool:
        """开始执行某个阶段"""
        return self.state_service.start_stage(scan_id, stage)

    def complete_stage(self, scan_id: int, stage: str, detail: str | None = None) -> bool:
        """完成某个阶段"""
        return self.state_service.complete_stage(scan_id, stage, detail)

    def fail_stage(self, scan_id: int, stage: str, error: str | None = None) -> bool:
        """标记某个阶段失败"""
        return self.state_service.fail_stage(scan_id, stage, error)

    def cancel_running_stages(self, scan_id: int, final_status: str = "cancelled") -> bool:
        """取消所有正在运行的阶段"""
        return self.state_service.cancel_running_stages(scan_id, final_status)

    # ==================== 删除和控制方法 ====================

    def delete_scans_two_phase(self, scan_ids: List[int]) -> dict:
        """两阶段删除扫描任务"""
        return self.control_service.delete_scans_two_phase(scan_ids)

    def stop_scan(self, scan_id: int) -> tuple[bool, int]:
        """停止扫描任务"""
        return self.control_service.stop_scan(scan_id)

    def hard_delete_scans(self, scan_ids: List[int]) -> tuple[int, Dict[str, int]]:
        """硬删除扫描任务（真正删除数据）"""
        return self.scan_repo.hard_delete_by_ids(scan_ids)

    # ==================== 统计方法 ====================

    def get_statistics(self) -> dict:
        """获取扫描统计数据"""
        return self.stats_service.get_statistics()


__all__ = ['ScanService']
