"""
Organization Django ORM 仓储实现

使用 Django ORM 实现组织数据访问
"""

import logging
from typing import List, Tuple, Dict

from ..models import Organization, Target

logger = logging.getLogger(__name__)


class DjangoOrganizationRepository:
    """Organization Django ORM 仓储实现"""
    
    def get_by_id(self, organization_id: int) -> Organization | None:
        """
        根据 ID 获取组织
        
        Args:
            organization_id: 组织 ID
        
        Returns:
            Organization 对象或 None
        """
        try:
            return Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            logger.warning("组织不存在 - Organization ID: %s", organization_id)
            return None
    
    def get_names_by_ids(self, organization_ids: List[int]) -> List[Tuple[int, str]]:
        """
        根据 ID 列表获取组织的 ID 和名称
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            [(id, name), ...] 元组列表
        """
        return list(
            Organization.objects
            .filter(id__in=organization_ids)
            .values_list('id', 'name')
        )
    
    def bulk_delete_by_ids(self, organization_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        根据 ID 列表批量删除组织
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            (删除的总记录数, {模型名: 删除数量})
        
        Raises:
            DatabaseError: 数据库错误
        
        Note:
            - 使用 Django ORM 批量删除
            - 删除组织不会删除关联的目标（多对多关系）
            - 只会清除关联关系
        """
        try:
            deleted_count, deleted_details = (
                Organization.objects
                .filter(id__in=organization_ids)
                .delete()
            )
            logger.debug(
                "批量删除组织成功 - Count: %s, 删除记录: %s",
                len(organization_ids),
                deleted_details
            )
            return deleted_count, deleted_details
        except Exception as e:
            logger.error(
                "批量删除组织失败 - IDs: %s, 错误: %s",
                organization_ids,
                e
            )
            raise
    
    def get_targets(self, organization_id: int) -> List[Target]:
        """
        获取组织下的所有目标
        
        Args:
            organization_id: 组织 ID
        
        Returns:
            Target 对象列表
        """
        organization = self.get_by_id(organization_id)
        if not organization:
            return []
        return list(organization.targets.all())
