import logging
from typing import Tuple

from apps.asset.models.asset_models import Directory
from apps.asset.repositories.django_directory_repository import DjangoDirectoryRepository

logger = logging.getLogger(__name__)


class DirectoryService:
    """目录业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化目录服务
        
        Args:
            repository: 目录仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoDirectoryRepository()
    

    
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
    
    # ==================== 创建操作 ====================
    
    def bulk_create_ignore_conflicts(self, directory_dtos: list) -> None:
        """
        批量创建目录记录，忽略冲突（用于扫描任务）
        
        Args:
            directory_dtos: DirectoryDTO 列表
        """
        return self.repo.bulk_create_ignore_conflicts(directory_dtos)
    
    # ==================== 查询操作 ====================
    
    def get_directories_info(self, directory_ids: list[int]) -> tuple[list[int], list[str]]:
        """获取Directory信息（ID 和名称）"""
        items = list(
            Directory.objects
            .filter(id__in=directory_ids)
            .values_list('id', 'url')
        )
        
        if not items:
            return [], []
        
        existing_ids = [s[0] for s in items]
        names = [s[1] for s in items]
        
        return existing_ids, names
    
    # ==================== 删除操作 ====================
    
    def delete_directories_two_phase(self, directory_ids: list[int]) -> dict:
        """
        两阶段删除Directory（业务方法）
        
        Args:
            directory_ids: Directory ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'directory_names': list[str],
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的Directory
        """
        
        # 1. 获取Directory信息
        existing_ids, names = self.get_directories_info(directory_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的Directory")
        
        # 2. 软删除
        soft_count = self.soft_delete_directories(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个Directory")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - Directory: {', '.join(names[:5])}{'...' if len(names) > 5 else ''}")
        
        try:
            from asgiref.sync import async_to_sync
            
            flow_kwargs = {
                'directory_ids': existing_ids,
                'directory_names': names
            }
            
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-directories/delete-directories-on-demand",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
            'directory_names': names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_directories(self, directory_ids: list[int]) -> int:
        """软删除Directory"""
        logger.info("软删除 %d 个Directory", len(directory_ids))
        
        try:
            deleted_count = self.repo.soft_delete_by_ids(directory_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_directories(self, directory_ids: list[int]) -> tuple[int, dict[str, int]]:
        """硬删除Directory（真正删除数据）- 使用数据库级 CASCADE"""
        logger.debug("准备硬删除Directory（CASCADE）- Count: %s, IDs: %s", len(directory_ids), directory_ids)
        
        deleted_count, details = self.repo.hard_delete_by_ids(directory_ids)
        
        logger.info(
            "硬删除Directory成功（CASCADE）- Count: %s, 删除记录数: %s",
            len(directory_ids),
            deleted_count
        )
        
        return deleted_count, details

    def get_all(self):
        """
        获取所有目录
        
        Returns:
            QuerySet: 目录查询集
        """
        logger.debug("获取所有目录")
        return self.repo.get_all()


__all__ = ['DirectoryService']
