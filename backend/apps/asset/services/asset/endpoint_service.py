"""
Endpoint 服务层

处理 URL/端点相关的业务逻辑
"""

import logging
from typing import List, Iterator

from apps.asset.dtos.asset import EndpointDTO
from apps.asset.repositories.asset import DjangoEndpointRepository

logger = logging.getLogger(__name__)


class EndpointService:
    """
    Endpoint 服务类
    
    提供 Endpoint（URL/端点）相关的业务逻辑
    """
    
    def __init__(self):
        """初始化 Endpoint 服务"""
        self.repo = DjangoEndpointRepository()
    
    def bulk_upsert(self, endpoints: List[EndpointDTO]) -> int:
        """
        批量创建或更新端点（upsert）
        
        存在则更新所有字段，不存在则创建。
        
        Args:
            endpoints: 端点数据列表
            
        Returns:
            int: 处理的记录数
        """
        if not endpoints:
            return 0
        
        try:
            return self.repo.bulk_upsert(endpoints)
        except Exception as e:
            logger.error(f"批量 upsert 端点失败: {e}")
            raise
    
    def get_endpoints_by_target(self, target_id: int):
        """获取目标下的所有端点"""
        return self.repo.get_by_target(target_id)
    
    def count_endpoints_by_target(self, target_id: int) -> int:
        """
        统计目标下的端点数量
        
        Args:
            target_id: 目标 ID
            
        Returns:
            int: 端点数量
        """
        return self.repo.count_by_target(target_id)

    def get_all(self):
        """获取所有端点（全局查询）"""
        return self.repo.get_all()
    
    def iter_endpoint_urls_by_target(self, target_id: int, chunk_size: int = 1000) -> Iterator[str]:
        """流式获取目标下的所有端点 URL，用于导出。"""
        queryset = self.repo.get_by_target(target_id)
        for url in queryset.values_list('url', flat=True).iterator(chunk_size=chunk_size):
            yield url
