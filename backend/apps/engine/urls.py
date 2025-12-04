from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScanEngineViewSet, WorkerNodeViewSet, WordlistViewSet, NucleiTemplateViewSet

# 创建路由器
router = DefaultRouter()
router.register(r'engines', ScanEngineViewSet, basename='engine')
router.register(r'workers', WorkerNodeViewSet, basename='worker')
router.register(r'wordlists', WordlistViewSet, basename='wordlist')
router.register(r'nuclei/templates', NucleiTemplateViewSet, basename='nuclei-templates')

urlpatterns = [
    path('', include(router.urls)),
]

