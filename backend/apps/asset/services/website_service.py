import logging
from typing import Tuple, List

from apps.asset.repositories.django_website_repository import DjangoWebSiteRepository
from apps.asset.repositories.website_repository import WebSiteDTO

logger = logging.getLogger(__name__)


class WebSiteService:
    """网站业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化网站服务
        
        Args:
            repository: 网站仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoWebSiteRepository()
    
    def get_all(self):
        """
        获取所有网站
        
        Returns:
            QuerySet: 网站查询集
        """
        logger.debug("获取所有网站")
        return self.repo.get_all()
    
    def bulk_delete(self, website_ids: list[int]) -> Tuple[int, str]:
        """
        批量删除网站
        
        Args:
            website_ids: 网站 ID 列表
            
        Returns:
            Tuple[int, str]: (删除数量, 消息)
            
        Raises:
            DatabaseError: 数据库错误
        """
        logger.info("批量删除网站 - IDs: %s", website_ids)
        
        deleted_count, deleted_objects = self.repo.bulk_delete_by_ids(website_ids)
        
        logger.info(
            "批量删除网站成功 - 数量: %d, 级联删除: %s",
            deleted_count,
            deleted_objects
        )
        
        return deleted_count, f"已成功删除 {deleted_count} 个站点及其关联数据"
    
    def bulk_create_ignore_conflicts(self, items: List[WebSiteDTO]) -> None:
        """
        批量创建网站，忽略冲突
        
        Args:
            items: 网站 DTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建网站 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)


__all__ = ['WebSiteService']
