import logging
from typing import Tuple, Iterator

from apps.asset.models.asset_models import Directory
from apps.asset.repositories import DjangoDirectoryRepository

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
    
    # ==================== 删除操作 ====================
    
    def delete_directories_two_phase(self, directory_ids: list[int]) -> dict:
        """
        两阶段删除Directory（业务方法）
        
        Args:
            directory_ids: Directory ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的Directory
        """
        
        # 1. 软删除（如果 ID 不存在，update 返回 0）
        soft_count = self.soft_delete_directories(directory_ids)
        
        # 2. 检查是否有记录被删除
        if soft_count == 0:
            raise ValueError("未找到要删除的Directory")
        
        logger.info(f"✓ 软删除完成: {soft_count} 个Directory")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - Directory数量: {soft_count}")
        
        try:
            from asgiref.sync import async_to_sync
            
            flow_kwargs = {'directory_ids': directory_ids}
            
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
    
    def get_directories_by_target(self, target_id: int):
        logger.debug("获取目标下所有目录 - Target ID: %d", target_id)
        return self.repo.get_by_target(target_id)

    def iter_directory_urls_by_target(self, target_id: int, chunk_size: int = 1000) -> Iterator[str]:
        """流式获取目标下的所有目录 URL，用于导出大批量数据。"""
        logger.debug("流式导出目标下目录 URL - Target ID: %d", target_id)
        return self.repo.get_urls_for_export(target_id=target_id, batch_size=chunk_size)


__all__ = ['DirectoryService']
