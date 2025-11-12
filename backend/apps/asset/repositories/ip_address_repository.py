"""
IPAddress Repository 接口定义
"""

from dataclasses import dataclass
from typing import Protocol, List


@dataclass
class IPAddressDTO:
    """IPAddress 数据传输对象"""
    subdomain_id: int
    ip: str
    target_id: int
    scan_id: int = None  # 扫描任务ID（可选）


class IPAddressRepository(Protocol):
    """IPAddress Repository 接口"""

    def bulk_create_ignore_conflicts(self, items: List[IPAddressDTO]) -> None:
        """
        批量创建 IPAddress，忽略冲突
        
        Args:
            items: IPAddress DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        ...
    
    def get_by_subdomain_and_ips(
        self, 
        subdomain_ids: set, 
        ip_addrs: set
    ) -> dict:
        """
        根据 subdomain_id 和 ip 批量查询 IPAddress
        
        Args:
            subdomain_ids: subdomain ID 集合
            ip_addrs: IP 地址集合
            
        Returns:
            dict: {(subdomain_id, ip): IPAddress对象}
        """
        ...
