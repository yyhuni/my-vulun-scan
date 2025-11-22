"""WebsiteSnapshot DTO"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class WebsiteSnapshotDTO:
    """网站快照 DTO"""
    scan_id: int
    subdomain_id: int
    url: str
    title: str = ''
    status: Optional[int] = None
    content_length: Optional[int] = None
    location: str = ''
    web_server: str = ''
    content_type: str = ''
    tech: List[str] = None
    body_preview: str = ''
    vhost: Optional[bool] = None
    target_id: Optional[int] = None  # 冗余字段，用于同步到资产表
    
    def __post_init__(self):
        if self.tech is None:
            self.tech = []
    
    def to_asset_dto(self):
        """
        转换为资产 DTO（用于同步到资产表）
        
        Returns:
            WebSiteDTO: 资产表 DTO（移除 scan_id）
        """
        from apps.asset.dtos.asset import WebSiteDTO
        
        if self.target_id is None:
            raise ValueError("target_id 不能为 None，无法同步到资产表")
        
        return WebSiteDTO(
            target_id=self.target_id,
            subdomain_id=self.subdomain_id,
            url=self.url,
            title=self.title,
            status_code=self.status,
            content_length=self.content_length,
            location=self.location,
            webserver=self.web_server,
            content_type=self.content_type,
            tech=self.tech if self.tech else [],
            body_preview=self.body_preview,
            vhost=self.vhost
        )
