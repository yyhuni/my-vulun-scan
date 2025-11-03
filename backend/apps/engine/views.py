from rest_framework import viewsets

from .models import ScanEngine
from .serializers import ScanEngineSerializer


class ScanEngineViewSet(viewsets.ModelViewSet):
    """
    扫描引擎 ViewSet
    
    自动提供完整的 CRUD 操作：
    - GET /api/engines/ - 获取引擎列表
    - POST /api/engines/ - 创建新引擎
    - GET /api/engines/{id}/ - 获取引擎详情
    - PUT /api/engines/{id}/ - 更新引擎
    - PATCH /api/engines/{id}/ - 部分更新引擎
    - DELETE /api/engines/{id}/ - 删除引擎
    """
    
    queryset = ScanEngine.objects.all()  # pylint: disable=no-member
    serializer_class = ScanEngineSerializer
