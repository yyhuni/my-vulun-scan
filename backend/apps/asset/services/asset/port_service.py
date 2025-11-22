import logging
from typing import Tuple, List

from apps.asset.models.asset_models import Port
from apps.asset.repositories import DjangoPortRepository
from apps.asset.repositories.asset.django_port_repository import PortDTO

logger = logging.getLogger(__name__)


class PortService:
    """端口业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化端口服务
        
        Args:
            repository: 端口仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoPortRepository()
    

    
    # ==================== Prefect 任务提交 ====================
    
    async def _submit_delete_flow(self, deployment_name: str, parameters: dict) -> str:
        """使用 Prefect Client API 提交删除 Flow Run"""
        from prefect import get_client
        
        async with get_client() as client:
            deployment = await client.read_deployment_by_name(deployment_name)
            flow_run = await client.create_flow_run_from_deployment(
                deployment.id,
                parameters=parameters
            )
            return str(flow_run.id)
    
    # ==================== 查询操作 ====================
    
    def get_ports_info(self, port_ids: list[int]) -> tuple[list[int], list[str]]:
        """获取Port信息（ID 和名称）"""
        items = list(
            Port.objects
            .filter(id__in=port_ids)
            .values_list('id', 'port')
        )
        
        if not items:
            return [], []
        
        existing_ids = [s[0] for s in items]
        names = [s[1] for s in items]
        
        return existing_ids, names
    
    # ==================== 删除操作 ====================
    
    def delete_ports_two_phase(self, port_ids: list[int]) -> dict:
        """
        两阶段删除Port（业务方法）
        
        Args:
            port_ids: Port ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'port_names': list[str],
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的Port
        """
        
        # 1. 获取Port信息
        existing_ids, names = self.get_ports_info(port_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的Port")
        
        # 2. 软删除
        soft_count = self.soft_delete_ports(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个Port")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - Port: {', '.join(names[:5])}{'...' if len(names) > 5 else ''}")
        
        try:
            from asgiref.sync import async_to_sync
            
            flow_kwargs = {
                'port_ids': existing_ids,
                'port_names': names
            }
            
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-ports/delete-ports-on-demand",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
            'port_names': names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_ports(self, port_ids: list[int]) -> int:
        """软删除Port"""
        logger.info("软删除 %d 个Port", len(port_ids))
        
        try:
            deleted_count = self.repo.soft_delete_by_ids(port_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_ports(self, port_ids: list[int]) -> tuple[int, dict[str, int]]:
        """硬删除Port（真正删除数据）- 使用数据库级 CASCADE"""
        logger.debug("准备硬删除Port（CASCADE）- Count: %s, IDs: %s", len(port_ids), port_ids)
        
        deleted_count, details = self.repo.hard_delete_by_ids(port_ids)
        
        logger.info(
            "硬删除Port成功（CASCADE）- Count: %s, 删除记录数: %s",
            len(port_ids),
            deleted_count
        )
        
        return deleted_count, details

    def get_all(self):
        """
        获取所有端口
        
        Returns:
            QuerySet: 端口查询集
        """
        logger.debug("获取所有端口")
        return self.repo.get_all()
    
    # ==================== 创建操作 ====================
    
    def bulk_create_ignore_conflicts(self, items: List[PortDTO]) -> None:
        """
        批量创建端口，忽略冲突
        
        Args:
            items: 端口 DTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建端口 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)


__all__ = ['PortService']
