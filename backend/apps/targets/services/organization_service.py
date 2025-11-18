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
    
    def get_all(self):
        """
        获取所有组织
        
        Returns:
            QuerySet: 组织查询集
        """
        return self.repo.get_all()
    
    def get_all_with_stats(self):
        """
        获取所有组织（带统计信息）
        
        Returns:
            QuerySet: 带统计信息的组织查询集
        """
        return self.repo.get_all_with_stats()
    
    # ==================== 删除操作 ====================
    
    def delete_organizations_two_phase(self, organization_ids: List[int]) -> Dict:
        """
        两阶段删除组织（业务方法）
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'organization_names': List[str],
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的组织
        
        Note:
            - 阶段 1：软删除（立即），用户立即看不到数据
            - 阶段 2：硬删除（后台），真正删除数据和中间表
        """
        import asyncio
        from asgiref.sync import sync_to_async
        
        # 1. 获取组织信息
        existing_ids, organization_names = self.get_organizations_info(organization_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的组织")
        
        # 2. 软删除
        soft_count, _ = self.soft_delete_organizations(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个组织")
        
        # 3. 后台硬删除
        async def _bg_hard_delete():
            try:
                count, _ = await sync_to_async(
                    self.hard_delete_organizations
                )(existing_ids)
                logger.info(f"✓ 硬删除完成: {count} 条记录，组织: {', '.join(organization_names)}")
            except Exception as e:
                logger.error(f"❌ 硬删除失败 - {', '.join(organization_names)}: {e}")
        
        asyncio.create_task(_bg_hard_delete())
        
        return {
            'soft_deleted_count': soft_count,
            'organization_names': organization_names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_organizations(self, organization_ids: List[int]) -> Tuple[int, List[int]]:
        """
        软删除组织
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            (软删除的记录数, 成功的ID列表)
        """
        logger.info("软删除 %d 个组织", len(organization_ids))
        
        try:
            deleted_count = self.repo.bulk_delete_by_ids(organization_ids)
            successful_ids = organization_ids[:deleted_count] if deleted_count > 0 else []
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count, successful_ids
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_organizations(self, organization_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        硬删除组织（真正删除数据，使用 Django CASCADE）
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        
        Note:
            - 从数据库中永久删除
            - Django CASCADE 自动删除 organization_targets 中间表记录
            - 不会删除关联的 Target（多对多）
            - ⚠️ 不可恢复
        """
        logger.info("硬删除 %d 个组织", len(organization_ids))
        
        try:
            deleted_count, deleted_details = self.repo.hard_delete_by_ids(organization_ids)
            logger.info("✓ 硬删除成功 - 数量: %d, 删除记录数: %d", len(organization_ids), deleted_count)
            return deleted_count, deleted_details
        except Exception as e:
            logger.error("❌ 硬删除失败 - IDs: %s, 错误: %s", organization_ids, e)
            raise
