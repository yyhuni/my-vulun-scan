from dataclasses import dataclass
from typing import List, Optional, Protocol, Iterator


@dataclass(frozen=True)
class SubdomainDTO:
    """数据传输对象：用于跨层传递子域名数据。"""
    name: str
    scan_id: Optional[int]
    target_id: Optional[int]


class SubdomainRepository(Protocol):
    """子域名仓储抽象接口。"""

    def bulk_create_ignore_conflicts(self, items: List[SubdomainDTO]) -> None:
        """
        批量创建子域名，忽略冲突
        
        Args:
            items: 子域名 DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        raise NotImplementedError
    
    def get_domains_for_export(self, target_id: int, batch_size: int = 1000) -> Iterator[str]:
        """
        流式导出域名（用于生成扫描工具输入文件）
        
        Args:
            target_id: 目标 ID
            batch_size: 每次读取的批次大小
            
        Yields:
            str: 域名
        """
        raise NotImplementedError
    
    def count_by_target(self, target_id: int) -> int:
        """
        统计目标下的域名数量
        
        Args:
            target_id: 目标 ID
            
        Returns:
            int: 域名数量
        """
        raise NotImplementedError
    
    def get_by_names(self, names: set, target_id: int) -> dict:
        """
        根据域名列表批量查询 Subdomain
        
        Args:
            names: 域名集合
            target_id: 目标 ID
            
        Returns:
            dict: {domain_name: Subdomain对象}
        """
        raise NotImplementedError


