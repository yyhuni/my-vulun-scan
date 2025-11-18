"""
Target Django ORM 仓储实现

使用 Django ORM 实现目标数据访问
"""

import logging
from typing import List, Tuple, Dict
from django.utils import timezone

from ..models import Target
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoTargetRepository:
    """Target Django ORM 仓储实现"""
    
    def get_by_id(self, target_id: int) -> Target | None:
        """
        根据 ID 获取目标
        
        Args:
            target_id: 目标 ID
        
        Returns:
            Target 对象或 None
        """
        try:
            return Target.objects.get(id=target_id)
        except Target.DoesNotExist:
            logger.warning("目标不存在 - Target ID: %s", target_id)
            return None
    
    def get_names_by_ids(self, target_ids: List[int]) -> List[Tuple[int, str]]:
        """
        根据 ID 列表获取目标的 ID 和名称
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            [(id, name), ...] 元组列表
        """
        return list(
            Target.objects
            .filter(id__in=target_ids)
            .values_list('id', 'name')
        )
    
    def bulk_delete_by_ids(self, target_ids: List[int]) -> int:
        """
        根据 ID 列表批量软删除目标
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            软删除的记录数
        
        Note:
            - 使用软删除：只标记为已删除，不真正删除数据库记录
            - 保留所有关联数据，可恢复
        """
        try:
            updated_count = (
                Target.objects
                .filter(id__in=target_ids)
                .update(
                    is_deleted=True,
                    deleted_at=timezone.now()
                )
            )
            logger.debug(
                "批量软删除目标成功 - Count: %s, 更新记录: %s",
                len(target_ids),
                updated_count
            )
            return updated_count
        except Exception as e:
            logger.error(
                "批量软删除目标失败 - IDs: %s, 错误: %s",
                target_ids,
                e
            )
            raise
    
    def get_all(self):
        """
        获取所有目标
        
        Returns:
            QuerySet: 目标查询集
        """
        return Target.objects.prefetch_related('organizations').all()
    
    def get_or_create(self, name: str, target_type: str):
        """
        获取或创建目标
        
        Args:
            name: 目标名称
            target_type: 目标类型
        
        Returns:
            (Target对象, 是否新创建的布尔值)
        """
        return Target.objects.get_or_create(
            name=name,
            defaults={'type': target_type}
        )
    
    def get_by_ids(self, target_ids: List[int]) -> List[Target]:
        """
        根据 ID 列表获取目标（只返回未删除的）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            Target 对象列表
        """
        return list(Target.objects.filter(id__in=target_ids))
    
    def hard_delete_by_ids(self, target_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        根据 ID 列表硬删除目标（真正删除数据）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        
        Note:
            - 硬删除：从数据库中永久删除
            - 使用 Django CASCADE 自动删除所有关联数据
            - ⚠️ 不可恢复
            - @auto_ensure_db_connection 自动重试数据库连接失败
        """
        try:
            # Django delete() 返回 (总删除数, {模型名: 删除数})
            # 使用 all_objects 管理器，可以删除已软删除的记录
            deleted_count, deleted_details = (
                Target.all_objects
                .filter(id__in=target_ids)
                .delete()
            )
            
            logger.debug(
                "硬删除目标成功 - Count: %s, 删除记录数: %s, 详情: %s",
                len(target_ids),
                deleted_count,
                deleted_details
            )
            
            return deleted_count, deleted_details
            
        except Exception as e:
            logger.error(
                "硬删除目标失败 - IDs: %s, 错误: %s",
                target_ids,
                e
            )
            raise
    
