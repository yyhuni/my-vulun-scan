import logging
from typing import Tuple

from apps.asset.repositories.django_directory_repository import DjangoDirectoryRepository

logger = logging.getLogger(__name__)


class DirectoryService:
    """目录业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化目录服务
        
        Args:
            repository: 目录仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoDirectoryRepository()
    
    def get_all(self):
        """
        获取所有目录
        
        Returns:
            QuerySet: 目录查询集
        """
        logger.debug("获取所有目录")
        return self.repo.get_all()
    
    def bulk_delete(self, directory_ids: list[int]) -> Tuple[int, str]:
        """
        批量删除目录
        
        Args:
            directory_ids: 目录 ID 列表
            
        Returns:
            Tuple[int, str]: (删除数量, 消息)
            
        Raises:
            DatabaseError: 数据库错误
        """
        logger.info("批量删除目录 - IDs: %s", directory_ids)
        
        deleted_count, deleted_objects = self.repo.bulk_delete_by_ids(directory_ids)
        
        logger.info(
            "批量删除目录成功 - 数量: %d, 级联删除: %s",
            deleted_count,
            deleted_objects
        )
        
        return deleted_count, f"已成功删除 {deleted_count} 个目录"


__all__ = ['DirectoryService']
