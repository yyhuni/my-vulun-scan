"""
Asset 应用 URL 配置
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IPAddressViewSet, SubdomainViewSet, WebSiteViewSet, DirectoryViewSet

# 创建 DRF 路由器
router = DefaultRouter()

# 注册 ViewSet
router.register(r'ip-addresses', IPAddressViewSet, basename='ipaddress')
router.register(r'subdomains', SubdomainViewSet, basename='subdomain')
router.register(r'websites', WebSiteViewSet, basename='website')
router.register(r'directories', DirectoryViewSet, basename='directory')

urlpatterns = [
    path('', include(router.urls)),
]
