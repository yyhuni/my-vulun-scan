"""
Target 业务逻辑服务层（Service）

负责目标相关的业务逻辑处理
"""

import logging
from typing import List, Tuple, Dict, Any, Optional

from django.db import transaction

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
    
    
    def get_all(self):
        """
        获取所有目标
        
        Returns:
            QuerySet: 目标查询集
        """
        return self.repo.get_all()
    
    def update_last_scanned_at(self, target_id: int) -> bool:
        """
        更新目标的最后扫描时间
        
        Args:
            target_id: 目标 ID
        
        Returns:
            是否更新成功
        """
        from django.utils import timezone
        return self.repo.update_last_scanned_at(target_id, timezone.now())
    
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
    
    def batch_create_targets(
        self,
        targets_data: List[Dict[str, Any]],
        organization_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        批量创建目标
        
        Args:
            targets_data: 目标数据列表，每个元素包含 name 字段
            organization_id: 可选，关联到指定组织的 ID
        
        Returns:
            {
                'created_count': int,
                'reused_count': int,
                'failed_count': int,
                'failed_targets': List[Dict],
                'message': str
            }
        
        Raises:
            ValueError: 组织 ID 不存在时抛出
        """
        from apps.asset.services.asset.subdomain_service import SubdomainService
        from apps.common.normalizer import normalize_target
        from apps.common.validators import detect_target_type
        from .organization_service import OrganizationService
        
        subdomain_service = SubdomainService()
        
        created_targets = []
        reused_targets = []
        failed_targets = []
        
        # 如果指定了组织，先获取组织对象
        organization = None
        if organization_id:
            org_service = OrganizationService()
            organization = org_service.get_organization(organization_id)
            if not organization:
                raise ValueError(f'组织 ID {organization_id} 不存在')
        
        # 使用事务确保原子性
        with transaction.atomic():
            for target_data in targets_data:
                name = target_data.get('name')
                
                try:
                    # 1. 规范化
                    normalized_name = normalize_target(name)
                    # 2. 验证并检测类型
                    target_type = detect_target_type(normalized_name)
                except ValueError as e:
                    # 无法识别的格式，记录失败原因
                    failed_targets.append({
                        'name': name,
                        'reason': str(e)
                    })
                    continue
                
                # 3. 写入：创建或获取目标
                target, created = self.create_or_get_target(
                    name=normalized_name,
                    target_type=target_type
                )
                
                # 如果指定了组织，关联目标到组织
                if organization:
                    organization.targets.add(target)
                
                # 如果是域名类型，同时创建 Subdomain 记录
                if target_type == Target.TargetType.DOMAIN:
                    subdomain_service.get_or_create(
                        name=normalized_name,
                        target_id=target.id,
                    )
                
                # 记录创建或复用的目标
                if created:
                    created_targets.append(target)
                else:
                    reused_targets.append(target)
        
        # 构建响应消息
        message_parts = []
        if created_targets:
            message_parts.append(f'成功创建 {len(created_targets)} 个目标')
        if reused_targets:
            message_parts.append(f'复用 {len(reused_targets)} 个已存在的目标')
        if failed_targets:
            message_parts.append(f'失败 {len(failed_targets)} 个目标')
        
        message = '，'.join(message_parts) if message_parts else '无目标被处理'
        
        logger.info(
            "批量创建目标完成 - 创建: %d, 复用: %d, 失败: %d",
            len(created_targets), len(reused_targets), len(failed_targets)
        )
        
        return {
            'created_count': len(created_targets),
            'reused_count': len(reused_targets),
            'failed_count': len(failed_targets),
            'failed_targets': failed_targets,
            'message': message
        }
    
    # ==================== 删除操作 ====================
    
    def delete_targets_two_phase(self, target_ids: List[int]) -> Dict:
        """
        两阶段删除目标（业务方法）
        
        Args:
            target_ids: 目标 ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的目标
        
        Note:
            - 阶段 1：软删除（立即），用户立即看不到数据
            - 阶段 2：硬删除（后台），真正删除数据和关联
        """
        
        # 1. 软删除（如果 ID 不存在，update 返回 0）
        soft_count = self.soft_delete_targets(target_ids)
        
        # 2. 检查是否有记录被删除
        if soft_count == 0:
            raise ValueError("未找到要删除的目标")
        
        logger.info(f"✓ 软删除完成: {soft_count} 个目标")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - 目标数量: {soft_count}")
        
        try:
            from asgiref.sync import async_to_sync
            
            # 准备 Flow 参数（只传递 ID）
            flow_kwargs = {'target_ids': target_ids}
            
            # 使用 Prefect Client API 异步提交任务
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-targets/delete-targets-on-demand",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            # 如果 Prefect 提交失败，记录错误但不阻止软删除完成
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
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
