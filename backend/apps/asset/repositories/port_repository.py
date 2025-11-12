"""
Port Repository 接口定义
"""

from dataclasses import dataclass
from typing import Protocol, List


@dataclass
class PortDTO:
    """Port 数据传输对象"""
    ip_id: int
    target_id: int
    number: int
    service_name: str = ''


class PortRepository(Protocol):
    """Port Repository 接口"""

    def bulk_create_ignore_conflicts(self, items: List[PortDTO]) -> None:
        """
        批量创建 Port，忽略冲突
        
        Args:
            items: Port DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        ...
