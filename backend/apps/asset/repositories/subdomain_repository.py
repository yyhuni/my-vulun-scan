from dataclasses import dataclass
from typing import List, Optional, Protocol


@dataclass(frozen=True)
class SubdomainDTO:
    """数据传输对象：用于跨层传递子域名数据。"""
    name: str
    scan_id: Optional[int]
    target_id: Optional[int]


class SubdomainRepository(Protocol):
    """子域名仓储抽象接口。"""

    def bulk_create_ignore_conflicts(self, items: List[SubdomainDTO]) -> None:
        """
        批量创建子域名，忽略冲突
        
        Args:
            items: 子域名 DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        raise NotImplementedError


