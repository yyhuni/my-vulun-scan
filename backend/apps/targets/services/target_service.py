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
    
    # ==================== Prefect 任务提交 ====================
    
    async def _submit_delete_flow(self, deployment_name: str, parameters: Dict) -> str:
        """
        使用 Prefect Client API 提交删除 Flow Run（异步版本）
        
        Args:
            deployment_name: Deployment 完整名称（格式: flow_name/deployment_name）
            parameters: Flow 参数
        
        Returns:
            Flow Run ID
        
        Note:
            - 这是异步函数，需要在异步上下文中调用
            - 在同步上下文中使用 async_to_sync 包装
        """
        from prefect import get_client
        
        async with get_client() as client:
            # 1. 读取 Deployment
            deployment = await client.read_deployment_by_name(deployment_name)
            
            # 2. 创建 Flow Run
            flow_run = await client.create_flow_run_from_deployment(
                deployment.id,
                parameters=parameters
            )
            
            return str(flow_run.id)
    
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
        
        # 1. 获取目标信息
        existing_ids, target_names = self.get_targets_info(target_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的目标")
        
        # 2. 软删除
        soft_count = self.soft_delete_targets(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个目标")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - 目标: {', '.join(target_names)}")
        
        try:
            from asgiref.sync import async_to_sync
            
            # 准备 Flow 参数
            flow_kwargs = {
                'target_ids': existing_ids,
                'target_names': target_names
            }
            
            # 使用 Prefect Client API 异步提交任务
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-targets/delete-targets",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            # 如果 Prefect 提交失败，记录错误但不阻止软删除完成
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
            'target_names': target_names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_targets(self, target_ids: List[int]) -> int:
        """
        软删除目标
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            软删除的记录数
        
        Note:
            - 返回值是实际更新的记录数，不是传入的 ID 数量
            - 如果某些 ID 不存在，返回值会小于传入的 ID 数量
        """
        logger.info("软删除 %d 个目标", len(target_ids))
        
        try:
            deleted_count = self.repo.soft_delete_by_ids(target_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_targets(self, target_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        硬删除目标（真正删除数据）- 使用数据库级 CASCADE
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        
        Strategy:
            使用数据库级 CASCADE 删除，性能最优
        
        Note:
            - 硬删除：从数据库中永久删除
            - 数据库自动级联删除所有关联数据
            - 不触发 Django 信号（pre_delete/post_delete）
        """
        logger.debug("准备硬删除目标（CASCADE）- Count: %s, IDs: %s", len(target_ids), target_ids)
        
        deleted_count, details = self.repo.hard_delete_by_ids(target_ids)
        
        logger.info(
            "硬删除目标成功（CASCADE）- Count: %s, 删除记录数: %s",
            len(target_ids),
            deleted_count
        )
        
        return deleted_count, details
