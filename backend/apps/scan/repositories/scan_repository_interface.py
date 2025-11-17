"""
Scan 数据访问层接口定义（Protocol）

定义 Scan Repository 的抽象接口，供 Service 层依赖
"""

from __future__ import annotations
from typing import Protocol, List, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from apps.scan.models import Scan
    from apps.targets.models import Target
    from apps.engine.models import ScanEngine

from apps.common.definitions import ScanStatus


class ScanRepositoryInterface(Protocol):
    """Scan 数据访问层抽象接口"""
    
    # ==================== 基础 CRUD 操作 ====================
    
    def get_by_id(
        self,
        scan_id: int, 
        prefetch_relations: bool = False,
        for_update: bool = False
    ) -> Scan | None:
        """
        根据 ID 获取扫描任务
        
        Args:
            scan_id: 扫描任务 ID
            prefetch_relations: 是否预加载关联对象（engine, target）
            for_update: 是否加锁（用于更新场景）
        
        Returns:
            Scan 对象或 None
        """
        ...
    
    def get_by_id_for_update(self, scan_id: int) -> Scan | None:
        """
        根据 ID 获取扫描任务（加锁）
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            Scan 对象或 None
        """
        ...
    
    def create(
        self,
        target: Target,
        engine: ScanEngine,
        results_dir: str,
        status: ScanStatus = ScanStatus.INITIATED
    ) -> Scan:
        """
        创建扫描任务
        
        Args:
            target: 扫描目标
            engine: 扫描引擎
            results_dir: 结果目录
            status: 初始状态
        
        Returns:
            创建的 Scan 对象
        """
        ...
    
    def bulk_create(self, scans: List[Scan]) -> List[Scan]:
        """
        批量创建扫描任务
        
        Args:
            scans: Scan 对象列表
        
        Returns:
            创建的 Scan 对象列表
        """
        ...
    
    def bulk_delete(self, scan_ids: List[int]) -> tuple[int, dict]:
        """
        批量删除扫描任务（级联删除关联数据）
        
        Args:
            scan_ids: 扫描任务 ID 列表
        
        Returns:
            (删除数量, 删除详情字典)
        """
        ...
    
    # ==================== 查询操作 ====================
    
    def get_statistics(self) -> dict:
        """
        获取扫描任务统计数据
        
        Returns:
            统计数据字典
        """
        ...
    
    # ==================== 状态更新操作 ====================
    
    def update_status(
        self,
        scan_id: int,
        status: ScanStatus,
        error_message: str | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        更新扫描任务状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            error_message: 错误消息（可选）
            stopped_at: 结束时间（可选）
        
        Returns:
            是否更新成功
        """
        ...
    
    def append_flow_run_id(self, scan_id: int, flow_run_id: str) -> bool:
        """
        追加 Flow Run ID 到 flow_run_ids 数组（并发安全）
        
        Args:
            scan_id: 扫描任务 ID
            flow_run_id: Prefect Flow Run ID
        
        Returns:
            是否追加成功
        """
        ...
    
    def update_cached_stats(self, scan_id: int) -> bool:
        """
        更新扫描任务的缓存统计数据
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否更新成功
        """
        ...


__all__ = ['ScanRepositoryInterface']
