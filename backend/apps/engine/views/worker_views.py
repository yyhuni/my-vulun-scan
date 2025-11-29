"""
Worker 节点 Views
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.engine.serializers import WorkerNodeSerializer
from apps.engine.services import WorkerService


class WorkerNodeViewSet(viewsets.ModelViewSet):
    """
    Worker 节点 ViewSet
    
    HTTP API:
    - GET /api/workers/ - 获取节点列表
    - POST /api/workers/ - 创建节点
    - DELETE /api/workers/{id}/ - 删除节点
    - POST /api/workers/{id}/heartbeat/ - 心跳上报
    
    部署通过 WebSocket 终端进行:
    - ws://host/ws/workers/{id}/deploy/
    """
    
    serializer_class = WorkerNodeSerializer

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.worker_service = WorkerService()

    def get_queryset(self):
        """通过服务层获取 Worker 查询集"""
        return self.worker_service.get_all_workers()
    
    @action(detail=True, methods=['post'])
    def heartbeat(self, request, pk=None):
        """接收心跳上报"""
        # 先通过 DRF 的 get_object 做权限和存在性检查
        worker = self.get_object()
        info = request.data if request.data else None

        self.worker_service.update_heartbeat(worker.id, info)
        return Response({'status': 'ok'})
