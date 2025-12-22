"""WebSite Service - 网站业务逻辑层"""

import logging
from typing import List

from apps.asset.repositories import DjangoWebSiteRepository
from apps.asset.dtos import WebSiteDTO

logger = logging.getLogger(__name__)


class WebSiteService:
    """网站业务逻辑层"""
    
    def __init__(self, repository=None):
        """初始化网站服务"""
        self.repo = repository or DjangoWebSiteRepository()
    
    def bulk_upsert(self, website_dtos: List[WebSiteDTO]) -> int:
        """
        批量创建或更新网站（upsert）
        
        存在则更新所有字段，不存在则创建。
        
        Args:
            website_dtos: WebSiteDTO 列表
            
        Returns:
            int: 处理的记录数
        """
        if not website_dtos:
            return 0
        
        try:
            return self.repo.bulk_upsert(website_dtos)
        except Exception as e:
            logger.error(f"批量 upsert 网站失败: {e}")
            raise
    
    def get_websites_by_target(self, target_id: int):
        """获取目标下的所有网站"""
        return self.repo.get_by_target(target_id)
    
    def get_all(self):
        """获取所有网站"""
        return self.repo.get_all()
    
    def get_by_url(self, url: str, target_id: int) -> int:
        """根据 URL 和 target_id 查找网站 ID"""
        return self.repo.get_by_url(url=url, target_id=target_id)
    
    def iter_website_urls_by_target(self, target_id: int, chunk_size: int = 1000):
        """流式获取目标下的所有站点 URL"""
        return self.repo.get_urls_for_export(target_id=target_id, batch_size=chunk_size)


__all__ = ['WebSiteService']
