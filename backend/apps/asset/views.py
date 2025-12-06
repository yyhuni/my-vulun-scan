import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, OperationalError

from .serializers import SubdomainListSerializer, WebSiteSerializer, DirectorySerializer, VulnerabilitySerializer
from .services import SubdomainService, WebSiteService, DirectoryService, VulnerabilityService, AssetStatisticsService
from apps.common.pagination import BasePagination

logger = logging.getLogger(__name__)


class AssetStatisticsViewSet(viewsets.ViewSet):
    """
    资产统计 API
    
    提供仪表盘所需的统计数据（预聚合，读取缓存表）
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = AssetStatisticsService()
    
    def list(self, request):
        """
        获取资产统计数据
        
        GET /assets/statistics/
        
        返回:
        - totalTargets: 目标总数
        - totalSubdomains: 子域名总数
        - totalIps: IP 总数
        - totalEndpoints: 端点总数
        - totalWebsites: 网站总数
        - totalVulns: 漏洞总数
        - totalAssets: 总资产数
        - runningScans: 运行中的扫描数
        - updatedAt: 统计更新时间
        """
        try:
            stats = self.service.get_statistics()
            return Response({
                'totalTargets': stats['total_targets'],
                'totalSubdomains': stats['total_subdomains'],
                'totalIps': stats['total_ips'],
                'totalEndpoints': stats['total_endpoints'],
                'totalWebsites': stats['total_websites'],
                'totalVulns': stats['total_vulns'],
                'totalAssets': stats['total_assets'],
                'runningScans': stats['running_scans'],
                'updatedAt': stats['updated_at'],
                # 变化值
                'changeTargets': stats['change_targets'],
                'changeSubdomains': stats['change_subdomains'],
                'changeIps': stats['change_ips'],
                'changeEndpoints': stats['change_endpoints'],
                'changeWebsites': stats['change_websites'],
                'changeVulns': stats['change_vulns'],
                'changeAssets': stats['change_assets'],
                # 漏洞严重程度分布
                'vulnBySeverity': stats['vuln_by_severity'],
            })
        except (DatabaseError, OperationalError) as e:
            logger.exception("获取资产统计数据失败")
            return Response(
                {'error': '获取统计数据失败'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# 注意：IPAddress 模型已被重构为 HostPortMapping
# IPAddressViewSet 已删除，需要根据新架构重新实现


class SubdomainViewSet(viewsets.ModelViewSet):
    """子域名管理 ViewSet"""
    
    serializer_class = SubdomainListSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()


class WebSiteViewSet(viewsets.ModelViewSet):
    """站点管理 ViewSet"""
    
    serializer_class = WebSiteSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = WebSiteService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()


class DirectoryViewSet(viewsets.ModelViewSet):
    """目录管理 ViewSet"""
    
    serializer_class = DirectorySerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = DirectoryService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()


class VulnerabilityViewSet(viewsets.ReadOnlyModelViewSet):
    """漏洞资产管理 ViewSet（只读）"""
    
    serializer_class = VulnerabilitySerializer
    pagination_class = BasePagination
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = VulnerabilityService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
