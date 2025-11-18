import logging
from typing import Tuple, List

from apps.asset.repositories.django_ip_address_repository import DjangoIPAddressRepository, IPAddressDTO

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
    
    def get_all(self):
        """
        获取所有 IP 地址
        
        Returns:
            QuerySet: IP 地址查询集
        """
        logger.debug("获取所有 IP 地址")
        return self.repo.get_all()
    
    def bulk_delete(self, ip_address_ids: list[int]) -> Tuple[int, str]:
        """
        批量删除 IP 地址
        
        Args:
            ip_address_ids: IP 地址 ID 列表
            
        Returns:
            Tuple[int, str]: (删除数量, 消息)
            
        Raises:
            DatabaseError: 数据库错误
        """
        logger.info("批量删除 IP 地址 - IDs: %s", ip_address_ids)
        
        deleted_count, deleted_objects = self.repo.bulk_delete_by_ids(ip_address_ids)
        
        logger.info(
            "批量删除 IP 地址成功 - 数量: %d",
            deleted_count
        )
        
        return deleted_count, f"已成功删除 {deleted_count} 个 IP 地址"
    
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
    
    def get_by_subdomain_and_ips(
        self, 
        subdomain_ids: set, 
        ip_addrs: set
    ) -> dict:
        """
        根据子域名ID集合和IP地址集合批量查询 IP 地址
        
        Args:
            subdomain_ids: 子域名ID集合
            ip_addrs: IP地址集合
        
        Returns:
            dict: {(subdomain_id, ip): IPAddress对象}
        """
        logger.debug(
            "批量查询 IP 地址 - 子域名数: %d, IP数: %d",
            len(subdomain_ids),
            len(ip_addrs)
        )
        return self.repo.get_by_subdomain_and_ips(subdomain_ids, ip_addrs)


__all__ = ['IPAddressService']
