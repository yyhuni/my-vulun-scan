import logging
from typing import Tuple, List, Dict

from apps.asset.repositories.django_subdomain_repository import DjangoSubdomainRepository, SubdomainDTO

logger = logging.getLogger(__name__)


class SubdomainService:
    """子域名业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化子域名服务
        
        Args:
            repository: 子域名仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoSubdomainRepository()
    
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
    
    def get_subdomains_info(self, subdomain_ids: List[int]) -> Tuple[List[int], List[str]]:
        """
        获取子域名信息（ID 和名称）
        
        Args:
            subdomain_ids: 子域名 ID 列表
        
        Returns:
            (存在的ID列表, 子域名名称列表)
        """
        return self.repo.get_subdomains_info(subdomain_ids)
    
    def get_all(self):
        """
        获取所有子域名
        
        Returns:
            QuerySet: 子域名查询集
        """
        logger.debug("获取所有子域名")
        return self.repo.get_all()
    
    # ==================== 删除操作 ====================
    
    def delete_subdomains_two_phase(self, subdomain_ids: List[int]) -> Dict:
        """
        两阶段删除子域名（业务方法）
        
        Args:
            subdomain_ids: 子域名 ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'subdomain_names': List[str],
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的子域名
        
        Note:
            - 阶段 1：软删除（立即），用户立即看不到数据
            - 阶段 2：硬删除（后台），真正删除数据和关联
        """
        
        # 1. 获取子域名信息
        existing_ids, subdomain_names = self.get_subdomains_info(subdomain_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的子域名")
        
        # 2. 软删除
        soft_count = self.soft_delete_subdomains(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个子域名")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - 子域名: {', '.join(subdomain_names[:5])}{'...' if len(subdomain_names) > 5 else ''}")
        
        try:
            from asgiref.sync import async_to_sync
            
            # 准备 Flow 参数
            flow_kwargs = {
                'subdomain_ids': existing_ids,
                'subdomain_names': subdomain_names
            }
            
            # 使用 Prefect Client API 异步提交任务
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-subdomains/delete-subdomains-on-demand",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            # 如果 Prefect 提交失败，记录错误但不阻止软删除完成
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
            'subdomain_names': subdomain_names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_subdomains(self, subdomain_ids: List[int]) -> int:
        """
        软删除子域名
        
        Args:
            subdomain_ids: 子域名 ID 列表
        
        Returns:
            软删除的记录数
        
        Note:
            - 返回值是实际更新的记录数，不是传入的 ID 数量
            - 如果某些 ID 不存在，返回值会小于传入的 ID 数量
        """
        logger.info("软删除 %d 个子域名", len(subdomain_ids))
        
        try:
            deleted_count = self.repo.soft_delete_by_ids(subdomain_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_subdomains(self, subdomain_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        硬删除子域名（真正删除数据）- 使用数据库级 CASCADE
        
        Args:
            subdomain_ids: 子域名 ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        
        Strategy:
            使用数据库级 CASCADE 删除，性能最优
        
        Note:
            - 硬删除：从数据库中永久删除
            - 数据库自动级联删除所有关联数据
            - 不触发 Django 信号（pre_delete/post_delete）
        """
        logger.debug("准备硬删除子域名（CASCADE）- Count: %s, IDs: %s", len(subdomain_ids), subdomain_ids)
        
        deleted_count, details = self.repo.hard_delete_by_ids(subdomain_ids)
        
        logger.info(
            "硬删除子域名成功（CASCADE）- Count: %s, 删除记录数: %s",
            len(subdomain_ids),
            deleted_count
        )
        
        return deleted_count, details
    
    # ==================== 创建操作 ====================

    def bulk_create_ignore_conflicts(self, items: List[SubdomainDTO]) -> None:
        """
        批量创建子域名，忽略冲突
        
        Args:
            items: 子域名 DTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建子域名 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)
    
    def get_by_names_and_target_id(self, names: set, target_id: int) -> dict:
        """
        根据域名列表和目标ID批量查询子域名
        
        Args:
            names: 域名集合
            target_id: 目标 ID
        
        Returns:
            dict: {域名: Subdomain对象}
        """
        logger.debug("批量查询子域名 - 数量: %d, Target ID: %d", len(names), target_id)
        return self.repo.get_by_names_and_target_id(names, target_id)


__all__ = ['SubdomainService']
