"""
SubdomainIPAssociation 业务逻辑层
"""

import logging
from typing import List

from apps.asset.repositories import DjangoSubdomainIPAssociationRepository
from apps.asset.dtos import SubdomainIPAssociationDTO

logger = logging.getLogger(__name__)


class SubdomainIPAssociationService:
    """子域名-IP关联 业务逻辑层（纯资产）"""
    
    def __init__(self, repository=None):
        """
        初始化服务
        
        Args:
            repository: 仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoSubdomainIPAssociationRepository()
    
    def bulk_create_ignore_conflicts(self, items: List[SubdomainIPAssociationDTO]) -> None:
        """
        批量创建关联记录（纯资产表），忽略冲突
        
        Args:
            items: 关联 DTO 列表
        
        Note:
            使用 bulk_create + ignore_conflicts 高效批量插入。
            基于唯一约束，重复记录会被自动跳过。
        """
        logger.debug("批量创建子域名-IP关联 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)
    
    def get_by_subdomain(self, subdomain_id: int) -> list:
        """
        根据子域名ID查询所有关联记录
        
        Args:
            subdomain_id: 子域名ID
            
        Returns:
            list: 关联记录列表
        """
        logger.debug(
            "查询子域名-IP关联 - 子域名ID: %d",
            subdomain_id
        )
        return self.repo.get_by_subdomain(subdomain_id)
    
    def get_all(self):
        """
        获取所有关联记录
        
        Returns:
            QuerySet: 关联记录查询集
        """
        logger.debug("获取所有子域名-IP关联")
        return self.repo.get_all()


__all__ = ['SubdomainIPAssociationService']
