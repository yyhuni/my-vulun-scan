import logging
from typing import Tuple, List

from apps.asset.models.asset_models import WebSite
from apps.asset.repositories import DjangoWebSiteRepository
from apps.asset.dtos import WebSiteDTO

logger = logging.getLogger(__name__)


class WebSiteService:
    """网站业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化网站服务
        
        Args:
            repository: 网站仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoWebSiteRepository()
    

    
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
    
    def bulk_create_ignore_conflicts(self, website_dtos: List[WebSiteDTO]) -> None:
        """
        批量创建网站记录，忽略冲突（用于扫描任务）
        
        Args:
            website_dtos: WebSiteDTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建网站 - 数量: %d", len(website_dtos))
        return self.repo.bulk_create_ignore_conflicts(website_dtos)
    
    # ==================== 查询操作 ====================
    
    def get_by_url(self, url: str, target_id: int) -> int:
        """
        根据 URL 和 target_id 查找网站 ID
        
        Args:
            url: 网站 URL
            target_id: 目标 ID
            
        Returns:
            int: 网站 ID，如果不存在返回 None
        """
        return self.repo.get_by_url(url=url, target_id=target_id)
    
    # ==================== 删除操作 ====================
    
    def delete_websites_two_phase(self, website_ids: list[int]) -> dict:
        """
        两阶段删除WebSite（业务方法）
        
        Args:
            website_ids: WebSite ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的WebSite
        """
        
        # 1. 软删除（如果 ID 不存在，update 返回 0）
        soft_count = self.soft_delete_websites(website_ids)
        
        # 2. 检查是否有记录被删除
        if soft_count == 0:
            raise ValueError("未找到要删除的WebSite")
        
        logger.info(f"✓ 软删除完成: {soft_count} 个WebSite")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - WebSite数量: {soft_count}")
        
        try:
            from asgiref.sync import async_to_sync
            
            flow_kwargs = {'website_ids': website_ids}
            
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-websites/delete-websites-on-demand",
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
    
    def soft_delete_websites(self, website_ids: list[int]) -> int:
        """软删除WebSite"""
        logger.info("软删除 %d 个WebSite", len(website_ids))
        
        try:
            deleted_count = self.repo.soft_delete_by_ids(website_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_websites(self, website_ids: list[int]) -> tuple[int, dict[str, int]]:
        """硬删除WebSite（真正删除数据）- 使用数据库级 CASCADE"""
        logger.debug("准备硬删除WebSite（CASCADE）- Count: %s, IDs: %s", len(website_ids), website_ids)
        
        deleted_count, details = self.repo.hard_delete_by_ids(website_ids)
        
        logger.info(
            "硬删除WebSite成功（CASCADE）- Count: %s, 删除记录数: %s",
            len(website_ids),
            deleted_count
        )
        
        return deleted_count, details

    def get_all(self):
        """
        获取所有网站
        
        Returns:
            QuerySet: 网站查询集
        """
        logger.debug("获取所有网站")
        return self.repo.get_all()
    
    def get_websites_by_target(self, target_id: int):
        return self.repo.get_by_target(target_id)
    
    def count_websites_by_scan(self, scan_id: int) -> int:
        """
        统计扫描下的网站数量
        
        Args:
            scan_id: 扫描 ID
        
        Returns:
            int: 网站数量
        """
        logger.debug("统计扫描下网站数量 - Scan ID: %d", scan_id)
        from apps.asset.models import WebSite
        return WebSite.objects.filter(scan_id=scan_id).count()
    
    def iter_website_urls_by_target(self, target_id: int, chunk_size: int = 1000):
        """流式获取目标下的所有站点 URL（内存优化，委托给 Repository 层）"""
        logger.debug(
            "流式获取目标下所有站点 URL - Target ID: %d, 批次大小: %d",
            target_id,
            chunk_size,
        )
        # 通过仓储层统一访问数据库，避免 Service 直接依赖 ORM
        return self.repo.get_urls_for_export(target_id=target_id, batch_size=chunk_size)


__all__ = ['WebSiteService']
