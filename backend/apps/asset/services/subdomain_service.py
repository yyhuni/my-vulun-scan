import logging
from typing import Tuple, List

from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository, SubdomainDTO

logger = logging.getLogger(__name__)


class SubdomainService:
    """子域名业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化子域名服务
        
        Args:
            repository: 子域名仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoSubdomainRepository()
    
    def get_all(self):
        """
        获取所有子域名
        
        Returns:
            QuerySet: 子域名查询集
        """
        logger.debug("获取所有子域名")
        return self.repo.get_all()
    
    def bulk_delete(self, subdomain_ids: list[int]) -> Tuple[int, str]:
        """
        批量删除子域名
        
        Args:
            subdomain_ids: 子域名 ID 列表
            
        Returns:
            Tuple[int, str]: (删除数量, 消息)
            
        Raises:
            DatabaseError: 数据库错误
        """
        logger.info("批量删除子域名 - IDs: %s", subdomain_ids)
        
        deleted_count, deleted_objects = self.repo.bulk_delete_by_ids(subdomain_ids)
        
        logger.info(
            "批量删除子域名成功 - 数量: %d, 级联删除: %s",
            deleted_count,
            deleted_objects
        )
        
        return deleted_count, f"已成功删除 {deleted_count} 个子域名及其关联数据"
    
    def bulk_create_ignore_conflicts(self, items: List[SubdomainDTO]) -> None:
        """
        批量创建子域名，忽略冲突
        
        Args:
            items: 子域名 DTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建子域名 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)
    
    def get_by_names_and_target_id(self, names: set, target_id: int) -> dict:
        """
        根据域名列表和目标ID批量查询子域名
        
        Args:
            names: 域名集合
            target_id: 目标 ID
        
        Returns:
            dict: {域名: Subdomain对象}
        """
        logger.debug("批量查询子域名 - 数量: %d, Target ID: %d", len(names), target_id)
        return self.repo.get_by_names_and_target_id(names, target_id)


__all__ = ['SubdomainService']
