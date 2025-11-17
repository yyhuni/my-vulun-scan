"""
Target Django ORM 仓储实现

使用 Django ORM 实现目标数据访问
"""

import logging
from typing import List, Tuple, Dict

from ..models import Target

logger = logging.getLogger(__name__)


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
    
    def bulk_delete_by_ids(self, target_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        根据 ID 列表批量删除目标（级联删除）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (删除的总记录数, {模型名: 删除数量})
        
        Raises:
            DatabaseError: 数据库错误
        
        Note:
            - 使用 Django ORM 批量删除，性能优于逐个删除
            - 自动级联删除所有关联数据（子域名、IP、端点、漏洞等）
        """
        try:
            deleted_count, deleted_details = (
                Target.objects
                .filter(id__in=target_ids)
                .delete()
            )
            logger.debug(
                "批量删除目标成功 - Count: %s, 删除记录: %s",
                len(target_ids),
                deleted_details
            )
            return deleted_count, deleted_details
        except Exception as e:
            logger.error(
                "批量删除目标失败 - IDs: %s, 错误: %s",
                target_ids,
                e
            )
            raise
