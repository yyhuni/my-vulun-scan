"""
扫描任务服务

负责 Scan 模型的所有业务逻辑

使用 Prefect 3.x 进行异步任务编排
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Dict, List, TYPE_CHECKING
from datetime import datetime
from pathlib import Path
from django.conf import settings
from django.db import transaction
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from asgiref.sync import async_to_sync

from apps.scan.models import Scan
from apps.scan.repositories import DjangoScanRepository
from apps.targets.repositories import DjangoTargetRepository, DjangoOrganizationRepository
from apps.engine.repositories import DjangoEngineRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.scan.flows import initiate_scan_flow, delete_scans_flow  # 从 flows 导入
from apps.common.definitions import ScanStatus

logger = logging.getLogger(__name__)


async def _submit_flow_deployment_async(deployment_name: str, parameters: Dict) -> str:
    """
    使用 Prefect 3.x Client API 提交 Flow Run（异步版本）
    
    Args:
        deployment_name: Deployment 完整名称（格式: flow_name/deployment_name）
        parameters: Flow 参数
    
    Returns:
        Flow Run ID
    
    Raises:
        Exception: 提交失败
    
    Note:
        - 这是异步函数，可以在异步上下文中直接 await
        - 在同步上下文中使用 _submit_flow_deployment() 包装函数
    """
    from prefect import get_client
    
    async with get_client() as client:
        # 1. 读取 Deployment
        deployment = await client.read_deployment_by_name(deployment_name)
        
        # 2. 创建 Flow Run
        flow_run = await client.create_flow_run_from_deployment(
            deployment.id,
            parameters=parameters
        )
        
        return str(flow_run.id)


def _submit_flow_deployment(deployment_name: str, parameters: Dict) -> str:
    """
    同步包装函数：在同步上下文中提交 Flow Run
    
    使用 async_to_sync 而不是 asyncio.run，避免 ASGI 环境中的事件循环冲突。
    
    Args:
        deployment_name: Deployment 完整名称
        parameters: Flow 参数
    
    Returns:
        Flow Run ID
    
    Note:
        - 使用 async_to_sync 确保 ASGI 兼容性
        - 如果当前有事件循环，会在新线程中执行
        - 如果没有事件循环，直接在当前线程执行
    """
    return async_to_sync(_submit_flow_deployment_async)(deployment_name, parameters)


class ScanService:
    """
    扫描任务服务（协调者）
    
    职责：
    - 协调各个子服务
    - 提供统一的公共接口
    - 保持向后兼容
    
    注意：
    - 具体业务逻辑已拆分到子服务
    - 本类主要负责委托和协调
    """
    
    # 终态集合：这些状态一旦设置，不应该被覆盖
    FINAL_STATUSES = {
        ScanStatus.COMPLETED,
        ScanStatus.FAILED,
        ScanStatus.CANCELLED
    }
    
    def __init__(self):
        """
        初始化服务
        """
        # 初始化子服务
        from apps.scan.services.scan_creation_service import ScanCreationService
        from apps.scan.services.scan_state_service import ScanStateService
        from apps.scan.services.scan_control_service import ScanControlService
        from apps.scan.services.scan_stats_service import ScanStatsService
        
        self.creation_service = ScanCreationService()
        self.state_service = ScanStateService()
        self.control_service = ScanControlService()
        self.stats_service = ScanStatsService()
        
        # 保留 ScanRepository（用于 get_scan 方法）
        self.scan_repo = DjangoScanRepository()
    
    def get_scan(self, scan_id: int, prefetch_relations: bool) -> Scan | None:
        """
        获取扫描任务（包含关联对象）
        
        自动预加载 engine 和 target，避免 N+1 查询问题
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            Scan 对象（包含 engine 和 target）或 None
        """
        return self.scan_repo.get_by_id(scan_id, prefetch_relations)
    
    def prepare_initiate_scan(
        self,
        organization_id: int | None = None,
        target_id: int | None = None,
        engine_id: int | None = None
    ) -> tuple[List[Target], ScanEngine]:
        """
        为创建扫描任务做准备，返回所需的目标列表和扫描引擎
        """
        return self.creation_service.prepare_initiate_scan(
            organization_id, target_id, engine_id
        )
    
    def create_scans(
        self,
        targets: List[Target],
        engine: ScanEngine
    ) -> List[Scan]:
        """批量创建扫描任务（委托给 ScanCreationService）"""
        return self.creation_service.create_scans(targets, engine)
    
    # ==================== 状态管理方法（委托给 ScanStateService） ====================
    
    def update_status(
        self, 
        scan_id: int, 
        status: ScanStatus, 
        error_message: str | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """更新 Scan 状态（委托给 ScanStateService）"""
        return self.state_service.update_status(
            scan_id, status, error_message, stopped_at
        )
    
    def update_status_if_match(
        self,
        scan_id: int,
        current_status: ScanStatus,
        new_status: ScanStatus,
        stopped_at: datetime | None = None
    ) -> bool:
        """条件更新 Scan 状态（委托给 ScanStateService）"""
        return self.state_service.update_status_if_match(
            scan_id, current_status, new_status, stopped_at
        )
    
    def update_cached_stats(self, scan_id: int) -> bool:
        """更新缓存统计数据（委托给 ScanStateService）"""
        return self.state_service.update_cached_stats(scan_id)
    
    # ==================== 删除和控制方法（委托给 ScanControlService） ====================
    
    def delete_scans_two_phase(self, scan_ids: List[int]) -> dict:
        """两阶段删除扫描任务（委托给 ScanControlService）"""
        return self.control_service.delete_scans_two_phase(scan_ids)
    
    def stop_scan(self, scan_id: int) -> tuple[bool, int]:
        """停止扫描任务（委托给 ScanControlService）"""
        return self.control_service.stop_scan(scan_id)
    
    # ==================== 统计方法（委托给 ScanStatsService） ====================
    
    def get_statistics(self) -> dict:
        """获取扫描统计数据（委托给 ScanStatsService）"""
        return self.stats_service.get_statistics()
    


# 导出接口
__all__ = ['ScanService']
