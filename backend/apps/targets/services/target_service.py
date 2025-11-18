"""
Target 业务逻辑服务层（Service）

负责目标相关的业务逻辑处理
"""

import logging
from typing import List, Tuple, Dict

from ..models import Target
from ..repositories.django_target_repository import DjangoTargetRepository

logger = logging.getLogger(__name__)


class TargetService:
    """Target 业务逻辑服务"""
    
    def __init__(self):
        """初始化服务，注入 Repository 依赖"""
        self.repo = DjangoTargetRepository()
    
    # ==================== 查询操作 ====================
    
    def get_target(self, target_id: int) -> Target | None:
        """
        获取目标
        
        Args:
            target_id: 目标 ID
        
        Returns:
            Target 对象或 None
        """
        return self.repo.get_by_id(target_id)
    
    def get_targets_info(
        self, 
        target_ids: List[int]
    ) -> Tuple[List[int], List[str]]:
        """
        获取目标信息（ID 和名称）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (存在的ID列表, 目标名称列表)
        """
        targets = self.repo.get_names_by_ids(target_ids)
        
        if not targets:
            return [], []
        
        existing_ids = [t[0] for t in targets]
        target_names = [t[1] for t in targets]
        
        return existing_ids, target_names
    
    def get_all(self):
        """
        获取所有目标
        
        Returns:
            QuerySet: 目标查询集
        """
        return self.repo.get_all()
    
    # ==================== 创建操作 ====================
    
    def create_or_get_target(
        self, 
        name: str, 
        target_type: str
    ) -> Tuple[Target, bool]:
        """
        创建或获取目标
        
        Args:
            name: 目标名称
            target_type: 目标类型
        
        Returns:
            (Target对象, 是否新创建)
        """
        logger.debug("创建或获取目标 - Name: %s, Type: %s", name, target_type)
        target, created = self.repo.get_or_create(name, target_type)
        
        if created:
            logger.info("创建新目标 - ID: %s, Name: %s", target.id, name)
        else:
            logger.debug("目标已存在 - ID: %s, Name: %s", target.id, name)
        
        return target, created
    
    # ==================== 删除操作 ====================
    
    def delete_targets_two_phase(self, target_ids: List[int]) -> Dict:
        """
        两阶段删除目标（业务方法）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'target_names': List[str],
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的目标
        
        Note:
            - 阶段 1：软删除（立即），用户立即看不到数据
            - 阶段 2：硬删除（后台），真正删除数据和关联
        """
        import asyncio
        from asgiref.sync import sync_to_async
        
        # 1. 获取目标信息
        existing_ids, target_names = self.get_targets_info(target_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的目标")
        
        # 2. 软删除
        soft_count, _ = self.soft_delete_targets(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个目标")
        
        # 3. 后台硬删除
        async def _bg_hard_delete():
            try:
                count, _ = await sync_to_async(
                    self.hard_delete_targets
                )(existing_ids)
                logger.info(f"✓ 硬删除完成: {count} 条记录，目标: {', '.join(target_names)}")
            except Exception as e:
                logger.error(f"❌ 硬删除失败 - {', '.join(target_names)}: {e}")
        
        asyncio.create_task(_bg_hard_delete())
        
        return {
            'soft_deleted_count': soft_count,
            'target_names': target_names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_targets(self, target_ids: List[int]) -> Tuple[int, List[int]]:
        """
        软删除目标
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (软删除的记录数, 成功的ID列表)
        """
        logger.info("软删除 %d 个目标", len(target_ids))
        
        try:
            deleted_count = self.repo.bulk_delete_by_ids(target_ids)
            successful_ids = target_ids[:deleted_count] if deleted_count > 0 else []
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count, successful_ids
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_targets(self, target_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        硬删除目标（真正删除数据，使用 Django CASCADE）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        
        Note:
            - 从数据库中永久删除
            - Django CASCADE 自动删除所有关联数据
            - ⚠️ 不可恢复
        """
        logger.info("硬删除 %d 个目标", len(target_ids))
        
        try:
            deleted_count, deleted_details = self.repo.hard_delete_by_ids(target_ids)
            logger.info("✓ 硬删除成功 - 数量: %d, 删除记录数: %d", len(target_ids), deleted_count)
            return deleted_count, deleted_details
        except Exception as e:
            logger.error("❌ 硬删除失败 - IDs: %s, 错误: %s", target_ids, e)
            raise
