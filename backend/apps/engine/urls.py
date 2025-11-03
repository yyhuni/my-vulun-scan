from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanEngineViewSet

# 创建路由器
router = DefaultRouter()
router.register(r'', ScanEngineViewSet, basename='engine')

urlpatterns = [
    path('', include(router.urls)),
]

