"""
WebSite Repository 接口定义
"""

from dataclasses import dataclass
from typing import Protocol, List, Optional


@dataclass
class WebSiteDTO:
    """WebSite 数据传输对象"""
    scan_id: int
    target_id: int
    subdomain_id: int
    url: str
    location: str = ''
    title: str = ''
    webserver: str = ''
    body_preview: str = ''
    content_type: str = ''
    tech: List[str] = None
    status_code: Optional[int] = None
    content_length: Optional[int] = None
    vhost: Optional[bool] = None

    def __post_init__(self):
        if self.tech is None:
            self.tech = []


class WebSiteRepository(Protocol):
    """WebSite Repository 接口"""

    def bulk_create_ignore_conflicts(self, items: List[WebSiteDTO]) -> None:
        """
        批量创建 WebSite，忽略冲突
        
        Args:
            items: WebSite DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        ...
