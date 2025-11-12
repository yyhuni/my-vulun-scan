"""
IPAddress Repository 接口定义
"""

from dataclasses import dataclass
from typing import Protocol, List


@dataclass
class IPAddressDTO:
    """IPAddress 数据传输对象"""
    subdomain_id: int
    ip: str
    target_id: int


class IPAddressRepository(Protocol):
    """IPAddress Repository 接口"""

    def bulk_create_ignore_conflicts(self, items: List[IPAddressDTO]) -> None:
        """
        批量创建 IPAddress，忽略冲突
        
        Args:
            items: IPAddress DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        ...
