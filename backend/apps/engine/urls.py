from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ScanEngineViewSet,
    WorkerNodeViewSet,
    WordlistViewSet,
    NucleiTemplateRepoViewSet,
)
from .views.fingerprints import EholeFingerprintViewSet


# 创建路由器
router = DefaultRouter()
router.register(r"engines", ScanEngineViewSet, basename="engine")
router.register(r"workers", WorkerNodeViewSet, basename="worker")
router.register(r"wordlists", WordlistViewSet, basename="wordlist")
router.register(r"nuclei/repos", NucleiTemplateRepoViewSet, basename="nuclei-repos")
# 指纹管理
router.register(r"fingerprints/ehole", EholeFingerprintViewSet, basename="ehole-fingerprint")

urlpatterns = [
    path("", include(router.urls)),
]

