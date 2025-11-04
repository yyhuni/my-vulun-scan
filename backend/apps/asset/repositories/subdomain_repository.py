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

    def upsert_many(self, items: List[SubdomainDTO]) -> int:
        """
        批量插入（忽略已存在的记录）。

        Args:
            items: 子域名 DTO 列表

        Returns:
            实际新建的记录数量
        """
        raise NotImplementedError


