import logging
from typing import Tuple, List

from apps.asset.models.asset_models import IPAddress
from apps.asset.repositories import DjangoIPAddressRepository
from apps.asset.repositories.asset.ip_address_repository import IPAddressDTO

logger = logging.getLogger(__name__)


class IPAddressService:
    """IP 地址业务逻辑层"""
    
    def __init__(self, repository=None):
        """
        初始化 IP 地址服务
        
        Args:
            repository: IP 地址仓储实例（用于依赖注入）
        """
        self.repo = repository or DjangoIPAddressRepository()
    

    
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
    
    def get_ip_addresses_info(self, ip_address_ids: list[int]) -> tuple[list[int], list[str]]:
        """获取IPAddress信息（ID 和名称）"""
        items = list(
            IPAddress.objects
            .filter(id__in=ip_address_ids)
            .values_list('id', 'ip')
        )
        
        if not items:
            return [], []
        
        existing_ids = [s[0] for s in items]
        names = [s[1] for s in items]
        
        return existing_ids, names
    
    # ==================== 删除操作 ====================
    
    def delete_ip_addresses_two_phase(self, ip_address_ids: list[int]) -> dict:
        """
        两阶段删除IPAddress（业务方法）
        
        Args:
            ip_address_ids: IPAddress ID 列表
        
        Returns:
            {
                'soft_deleted_count': int,
                'ip_address_names': list[str],
                'hard_delete_scheduled': bool
            }
        
        Raises:
            ValueError: 未找到要删除的IPAddress
        """
        
        # 1. 获取IPAddress信息
        existing_ids, names = self.get_ip_addresses_info(ip_address_ids)
        
        if not existing_ids:
            raise ValueError("未找到要删除的IPAddress")
        
        # 2. 软删除
        soft_count = self.soft_delete_ip_addresses(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个IPAddress")
        
        # 3. 使用 Prefect Deployment 异步提交删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - IPAddress: {', '.join(names[:5])}{'...' if len(names) > 5 else ''}")
        
        try:
            from asgiref.sync import async_to_sync
            
            flow_kwargs = {
                'ip_address_ids': existing_ids,
                'ip_address_names': names
            }
            
            flow_run_id = async_to_sync(self._submit_delete_flow)(
                deployment_name="delete-ip-addresses/delete-ip-addresses-on-demand",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
        
        return {
            'soft_deleted_count': soft_count,
            'ip_address_names': names,
            'hard_delete_scheduled': True
        }
    
    def soft_delete_ip_addresses(self, ip_address_ids: list[int]) -> int:
        """软删除IPAddress"""
        logger.info("软删除 %d 个IPAddress", len(ip_address_ids))
        
        try:
            deleted_count = self.repo.soft_delete_by_ids(ip_address_ids)
            logger.info("✓ 软删除成功 - 数量: %d", deleted_count)
            return deleted_count
        except Exception as e:
            logger.error("软删除失败: %s", e)
            raise
    
    def hard_delete_ip_addresses(self, ip_address_ids: list[int]) -> tuple[int, dict[str, int]]:
        """硬删除IPAddress（真正删除数据）- 使用数据库级 CASCADE"""
        logger.debug("准备硬删除IPAddress（CASCADE）- Count: %s, IDs: %s", len(ip_address_ids), ip_address_ids)
        
        deleted_count, details = self.repo.hard_delete_by_ids(ip_address_ids)
        
        logger.info(
            "硬删除IPAddress成功（CASCADE）- Count: %s, 删除记录数: %s",
            len(ip_address_ids),
            deleted_count
        )
        
        return deleted_count, details

    def get_all(self):
        """
        获取所有 IP 地址
        
        Returns:
            QuerySet: IP 地址查询集
        """
        logger.debug("获取所有 IP 地址")
        return self.repo.get_all()
    
    # ==================== 创建操作 ====================
    
    def bulk_create_ignore_conflicts(self, items: List[IPAddressDTO]) -> None:
        """
        批量创建 IP 地址，忽略冲突
        
        Args:
            items: IP 地址 DTO 列表
        
        Note:
            使用 ignore_conflicts 策略，重复记录会被跳过
        """
        logger.debug("批量创建 IP 地址 - 数量: %d", len(items))
        return self.repo.bulk_create_ignore_conflicts(items)
    
    def get_by_ips(self, ip_addrs: set) -> dict:
        """
        根据 IP 地址字符串批量查询 IPAddress 对象
        
        Args:
            ip_addrs: IP 地址字符串集合（如 {"192.168.1.1", "10.0.0.1"}）
        
        Returns:
            dict: {ip字符串: IPAddress对象} 的映射，包含 ID 等完整信息
        """
        logger.debug("批量查询 IP 地址对象 - IP数: %d", len(ip_addrs))
        return self.repo.get_by_ips(ip_addrs)


__all__ = ['IPAddressService']
