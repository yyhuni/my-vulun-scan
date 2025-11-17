"""
Organization 业务逻辑服务层（Service）

负责组织相关的业务逻辑处理
"""

import logging
from typing import List, Tuple, Dict

from ..models import Organization
from ..repositories.django_organization_repository import DjangoOrganizationRepository

logger = logging.getLogger(__name__)


class OrganizationService:
    """Organization 业务逻辑服务"""
    
    def __init__(self):
        """初始化服务，注入 Repository 依赖"""
        self.repo = DjangoOrganizationRepository()
    
    # ==================== 查询操作 ====================
    
    def get_organization(self, organization_id: int) -> Organization | None:
        """
        获取组织
        
        Args:
            organization_id: 组织 ID
        
        Returns:
            Organization 对象或 None
        """
        return self.repo.get_by_id(organization_id)
    
    def get_organizations_info(
        self, 
        organization_ids: List[int]
    ) -> Tuple[List[int], List[str]]:
        """
        获取组织信息（ID 和名称）
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            (存在的ID列表, 组织名称列表)
        """
        organizations = self.repo.get_names_by_ids(organization_ids)
        
        if not organizations:
            return [], []
        
        existing_ids = [org[0] for org in organizations]
        organization_names = [org[1] for org in organizations]
        
        return existing_ids, organization_names
    
    # ==================== 删除操作 ====================
    
    def bulk_delete_organizations(
        self, 
        organization_ids: List[int]
    ) -> Tuple[int, Dict[str, int]]:
        """
        批量删除组织（业务逻辑层）
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            (删除的总记录数, {模型名: 删除数量})
        
        Note:
            - 删除组织不会删除关联的目标
            - 只会清除组织与目标的关联关系
            - 包含业务逻辑验证和日志记录
        """
        logger.info("准备批量删除组织 - Count: %s, IDs: %s", len(organization_ids), organization_ids)
        
        try:
            deleted_count, deleted_details = self.repo.bulk_delete_by_ids(organization_ids)
            
            logger.info(
                "批量删除组织成功 - Count: %s, 删除记录数: %s, 详情: %s",
                len(organization_ids),
                deleted_count,
                deleted_details
            )
            
            return deleted_count, deleted_details
            
        except Exception as e:
            logger.exception("批量删除组织失败 - IDs: %s", organization_ids)
            raise
