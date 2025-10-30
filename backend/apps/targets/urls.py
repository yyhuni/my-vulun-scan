from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrganizationViewSet, DomainViewSet

# 创建路由器
router = DefaultRouter()

# 注册 ViewSet
router.register(r'organizations', OrganizationViewSet, basename='organization')
router.register(r'domains', DomainViewSet, basename='domain')

urlpatterns = [
    path('', include(router.urls)),
]
