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
    
    def bulk_delete_targets(
        self, 
        target_ids: List[int]
    ) -> Tuple[int, Dict[str, int]]:
        """
        批量删除目标（业务逻辑层）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (删除的总记录数, {模型名: 删除数量})
        
        Note:
            - 级联删除所有关联数据
            - 包含业务逻辑验证和日志记录
        """
        logger.info("准备批量删除目标 - Count: %s, IDs: %s", len(target_ids), target_ids)
        
        try:
            deleted_count, deleted_details = self.repo.bulk_delete_by_ids(target_ids)
            
            logger.info(
                "批量删除目标成功 - Count: %s, 删除记录数: %s, 详情: %s",
                len(target_ids),
                deleted_count,
                deleted_details
            )
            
            return deleted_count, deleted_details
            
        except Exception as e:
            logger.exception("批量删除目标失败 - IDs: %s", target_ids)
            raise
