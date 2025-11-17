"""
ScanEngine 数据访问层接口定义（Protocol）

定义 ScanEngine Repository 的抽象接口
"""

from __future__ import annotations
from typing import Protocol, TYPE_CHECKING

if TYPE_CHECKING:
    from apps.engine.models import ScanEngine


class EngineRepositoryInterface(Protocol):
    """ScanEngine 数据访问层抽象接口"""
    
    def get_by_id(self, engine_id: int) -> ScanEngine | None:
        """
        根据 ID 获取扫描引擎
        
        Args:
            engine_id: 引擎 ID
        
        Returns:
            ScanEngine 对象或 None
        """
        ...


__all__ = ['EngineRepositoryInterface']
