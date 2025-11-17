"""
Directory Repository 接口定义
"""

from dataclasses import dataclass
from typing import Protocol, List, Optional


@dataclass
class DirectoryDTO:
    """Directory 数据传输对象"""
    website_id: int
    target_id: int
    scan_id: int
    url: str
    status: Optional[int] = None
    length: Optional[int] = None
    words: Optional[int] = None
    lines: Optional[int] = None
    content_type: str = ''
    duration: Optional[int] = None


class DirectoryRepository(Protocol):
    """Directory Repository 接口"""

    def bulk_create_ignore_conflicts(self, items: List[DirectoryDTO]) -> int:
        """
        批量创建 Directory，忽略冲突
        
        Args:
            items: Directory DTO 列表
            
        Returns:
            int: 实际创建的记录数
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        ...

    def get_by_website(self, website_id: int) -> List[DirectoryDTO]:
        """
        获取指定站点的所有目录
        
        Args:
            website_id: 站点 ID
            
        Returns:
            List[DirectoryDTO]: 目录列表
        """
        ...

    def count_by_website(self, website_id: int) -> int:
        """
        统计指定站点的目录总数
        
        Args:
            website_id: 站点 ID
            
        Returns:
            int: 目录总数
        """
        ...
