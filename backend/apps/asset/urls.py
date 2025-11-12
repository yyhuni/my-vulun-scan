"""
Asset 应用 URL 配置
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import IPAddressViewSet

# 创建 DRF 路由器
router = DefaultRouter()

# 注册 ViewSet
router.register(r'ip-addresses', IPAddressViewSet, basename='ipaddress')

urlpatterns = [
    path('', include(router.urls)),
]
