"""WebsiteSnapshot DTO"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class WebsiteSnapshotDTO:
    """
    网站快照 DTO
    
    注意：target_id 只用于传递数据和转换为资产 DTO，不会保存到快照表中。
    快照只属于 scan，target 信息通过 scan.target 获取。
    """
    scan_id: int
    target_id: int  # 必填，用于同步到资产表
    url: str
    host: str
    title: str = ''
    status_code: Optional[int] = None  # 统一命名：status -> status_code
    content_length: Optional[int] = None
    location: str = ''
    webserver: str = ''  # 统一命名：web_server -> webserver
    content_type: str = ''
    tech: List[str] = None
    response_body: str = ''
    vhost: Optional[bool] = None
    response_headers: str = ''
    
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
        
        return WebSiteDTO(
            target_id=self.target_id,
            url=self.url,
            host=self.host,
            title=self.title,
            status_code=self.status_code,
            content_length=self.content_length,
            location=self.location,
            webserver=self.webserver,
            content_type=self.content_type,
            tech=self.tech if self.tech else [],
            response_body=self.response_body,
            vhost=self.vhost,
            response_headers=self.response_headers,
        )
