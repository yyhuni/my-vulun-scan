from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanViewSet, ScheduledScanViewSet

# 创建路由器
router = DefaultRouter()

# 注册 ViewSet
router.register(r'scans', ScanViewSet, basename='scan')
router.register(r'scheduled-scans', ScheduledScanViewSet, basename='scheduled-scan')

urlpatterns = [
    path('', include(router.urls)),
]

