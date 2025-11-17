"""
WebSite Repository 抽象接口
"""

from dataclasses import dataclass
from typing import Protocol, List, Generator, Optional
from datetime import datetime


@dataclass(frozen=True)
class WebSiteDTO:
    """数据传输对象：用于跨层传递 WebSite 数据。"""
    scan_id: Optional[int]
    target_id: Optional[int]
    subdomain_id: Optional[int]
    url: str
    location: str
    title: str
    webserver: str
    body_preview: str
    content_type: str
    tech: List[str]
    status_code: int
    content_length: int
    vhost: bool
    created_at: datetime


class WebSiteRepository(Protocol):
    """WebSite Repository 抽象接口"""

    def bulk_create_ignore_conflicts(self, items: List[WebSiteDTO]) -> None:
        """
        批量创建 WebSite，忽略冲突
        
        Args:
            items: WebSite DTO 列表
        """
        raise NotImplementedError
    
    def get_urls_for_export(self, target_id: int, batch_size: int = 1000) -> Generator[str, None, None]:
        """
        流式导出目标下的所有站点 URL
        
        Args:
            target_id: 目标 ID
            batch_size: 批次大小
            
        Yields:
            str: 站点 URL
        """
        raise NotImplementedError
    
    def count_by_target(self, target_id: int) -> int:
        """
        统计目标下的站点总数
        
        Args:
            target_id: 目标 ID
            
        Returns:
            int: 站点总数
        """
        raise NotImplementedError
    
    def get_all(self):
        """
        获取所有网站
        
        Returns:
            QuerySet: 网站查询集
        """
        raise NotImplementedError
    
    def bulk_delete_by_ids(self, website_ids: List[int]) -> tuple:
        """
        批量删除网站
        
        Args:
            website_ids: 网站 ID 列表
            
        Returns:
            tuple: (删除数量, 级联删除的对象统计)
        """
        raise NotImplementedError
