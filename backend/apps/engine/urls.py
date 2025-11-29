from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanEngineViewSet, WorkerNodeViewSet, SystemConfigView

# 创建路由器
router = DefaultRouter()
router.register(r'engines', ScanEngineViewSet, basename='engine')
router.register(r'workers', WorkerNodeViewSet, basename='worker')

urlpatterns = [
    path('', include(router.urls)),
    # 系统配置 API
    path('system/config/', SystemConfigView.as_view(), name='system-config'),
]

