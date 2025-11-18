import logging
from typing import Tuple, List

from apps.asset.repositories.django_port_repository import DjangoPortRepository, PortDTO

logger = logging.getLogger(__name__)


class PortService:
    """端口业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化端口服务
        
        Args:
            repository: 端口仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoPortRepository()
    
    def get_all(self):
        """
        获取所有端口
        
        Returns:
            QuerySet: 端口查询集
        """
        logger.debug("获取所有端口")
        return self.repo.get_all()
    
    def bulk_delete(self, port_ids: list[int]) -> Tuple[int, str]:
        """
        批量删除端口
        
        Args:
            port_ids: 端口 ID 列表
            
        Returns:
            Tuple[int, str]: (删除数量, 消息)
            
        Raises:
            DatabaseError: 数据库错误
        """
        logger.info("批量删除端口 - IDs: %s", port_ids)
        
        deleted_count, deleted_objects = self.repo.bulk_delete_by_ids(port_ids)
        
        logger.info(
            "批量删除端口成功 - 数量: %d",
            deleted_count
        )
        
        return deleted_count, f"已成功删除 {deleted_count} 个端口"
    
    def bulk_create_ignore_conflicts(self, items: List[PortDTO]) -> None:
        """
        批量创建端口，忽略冲突
        
        Args:
            items: 端口 DTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建端口 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)


__all__ = ['PortService']
