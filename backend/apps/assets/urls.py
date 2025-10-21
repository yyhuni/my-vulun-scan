"""
资产管理路由配置
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, DomainViewSet, SubdomainViewSet

# 应用命名空间
app_name = 'assets'

# 创建路由器
router = DefaultRouter()

# 注册视图集
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'domains', DomainViewSet, basename='domain')
router.register(r'subdomains', SubdomainViewSet, basename='subdomain')

urlpatterns = [
    # 包含路由器生成的路由
    path('', include(router.urls)),
]
