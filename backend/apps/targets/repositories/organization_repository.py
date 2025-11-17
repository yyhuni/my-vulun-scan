"""
Organization 仓储抽象接口（Protocol）

定义组织数据访问的抽象接口
"""

from typing import List, Tuple, Dict, Protocol


class OrganizationRepository(Protocol):
    """Organization 仓储抽象接口"""
    
    def get_by_id(self, organization_id: int):
        """根据 ID 获取组织"""
        raise NotImplementedError
    
    def get_names_by_ids(self, organization_ids: List[int]) -> List[Tuple[int, str]]:
        """根据 ID 列表获取组织的 ID 和名称"""
        raise NotImplementedError
    
    def bulk_delete_by_ids(self, organization_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """根据 ID 列表批量删除组织"""
        raise NotImplementedError
