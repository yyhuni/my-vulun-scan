"""资产统计 Repository"""
import logging
from typing import Optional

from apps.asset.models import AssetStatistics

logger = logging.getLogger(__name__)


class AssetStatisticsRepository:
    """
    资产统计数据访问层
    
    职责：
    - 读取/更新预聚合的统计数据
    """

    def get_statistics(self) -> Optional[AssetStatistics]:
        """
        获取统计数据
        
        Returns:
            统计数据对象，不存在则返回 None
        """
        return AssetStatistics.objects.first()

    def get_or_create_statistics(self) -> AssetStatistics:
        """
        获取或创建统计数据（单例）
        
        Returns:
            统计数据对象
        """
        return AssetStatistics.get_or_create_singleton()

    def update_statistics(
        self,
        total_targets: int,
        total_subdomains: int,
        total_ips: int,
        total_endpoints: int,
        total_websites: int,
        total_vulns: int,
    ) -> AssetStatistics:
        """
        更新统计数据
        
        Args:
            total_targets: 目标总数
            total_subdomains: 子域名总数
            total_ips: IP 总数
            total_endpoints: 端点总数
            total_websites: 网站总数
            total_vulns: 漏洞总数
        
        Returns:
            更新后的统计数据对象
        """
        stats = self.get_or_create_statistics()
        
        # 1. 保存当前值到 prev_* 字段
        stats.prev_targets = stats.total_targets
        stats.prev_subdomains = stats.total_subdomains
        stats.prev_ips = stats.total_ips
        stats.prev_endpoints = stats.total_endpoints
        stats.prev_websites = stats.total_websites
        stats.prev_vulns = stats.total_vulns
        stats.prev_assets = stats.total_assets
        
        # 2. 更新当前值
        stats.total_targets = total_targets
        stats.total_subdomains = total_subdomains
        stats.total_ips = total_ips
        stats.total_endpoints = total_endpoints
        stats.total_websites = total_websites
        stats.total_vulns = total_vulns
        stats.total_assets = total_subdomains + total_ips + total_endpoints + total_websites
        stats.save()
        
        logger.info(
            "更新资产统计: targets=%d, subdomains=%d, ips=%d, endpoints=%d, websites=%d, vulns=%d, assets=%d",
            total_targets, total_subdomains, total_ips, total_endpoints, total_websites, total_vulns, stats.total_assets
        )
        return stats
