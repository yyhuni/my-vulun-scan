from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanEngineViewSet, WorkerNodeViewSet, WordlistViewSet

# 创建路由器
router = DefaultRouter()
router.register(r'engines', ScanEngineViewSet, basename='engine')
router.register(r'workers', WorkerNodeViewSet, basename='worker')
router.register(r'wordlists', WordlistViewSet, basename='wordlist')

urlpatterns = [
    path('', include(router.urls)),
]

