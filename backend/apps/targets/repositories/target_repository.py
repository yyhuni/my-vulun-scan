"""
Target 仓储抽象接口（Protocol）

定义目标数据访问的抽象接口
"""

from typing import List, Tuple, Dict, Protocol


class TargetRepository(Protocol):
    """Target 仓储抽象接口"""
    
    def get_by_id(self, target_id: int):
        """根据 ID 获取目标"""
        raise NotImplementedError
    
    def get_names_by_ids(self, target_ids: List[int]) -> List[Tuple[int, str]]:
        """根据 ID 列表获取目标的 ID 和名称"""
        raise NotImplementedError
    
    def bulk_delete_by_ids(self, target_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """根据 ID 列表批量删除目标（级联删除）"""
        raise NotImplementedError
