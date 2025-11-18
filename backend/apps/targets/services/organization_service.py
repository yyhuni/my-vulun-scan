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
        
        # 1. 获取组织信息
        existing_ids, organization_names = self.get_organizations_info(organization_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的组织")
        
        # 2. 软删除
        soft_count = self.soft_delete_organizations(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个组织")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - 组织: {', '.join(organization_names)}")
        
        try:
            from asgiref.sync import async_to_sync
            
            # 准备 Flow 参数
            flow_kwargs = {
                'organization_ids': existing_ids,
                'organization_names': organization_names
            }
            
            # 使用 Prefect Client API 异步提交任务
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-organizations/delete-organizations",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            # 如果 Prefect 提交失败，记录错误但不阻止软删除完成
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
            'organization_names': organization_names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_organizations(self, organization_ids: List[int]) -> int:
        """
        软删除组织
        
        Args:
            organization_ids: 组织 ID 列表
        
        Returns:
            软删除的记录数
        
        Note:
            - 返回值是实际更新的记录数，不是传入的 ID 数量
            - 如果某些 ID 不存在，返回值会小于传入的 ID 数量
        """
        logger.info("软删除 %d 个组织", len(organization_ids))
        
        try:
            deleted_count = self.repo.bulk_delete_by_ids(organization_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
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
        """
        logger.info("硬删除 %d 个组织", len(organization_ids))
        
        try:
            deleted_count, deleted_details = self.repo.hard_delete_by_ids(organization_ids)
            logger.info("✓ 硬删除成功 - 数量: %d, 删除记录数: %d", len(organization_ids), deleted_count)
            return deleted_count, deleted_details
        except Exception as e:
            logger.error("❌ 硬删除失败 - IDs: %s, 错误: %s", organization_ids, e)
            raise
