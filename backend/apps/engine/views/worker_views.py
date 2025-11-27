"""
Worker 节点 Views
"""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.engine.models import WorkerNode
from apps.engine.serializers import WorkerNodeSerializer


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
    
    queryset = WorkerNode.objects.all()
    serializer_class = WorkerNodeSerializer
    
    @action(detail=True, methods=['post'])
    def heartbeat(self, request, pk=None):
        """接收心跳上报"""
        worker = self.get_object()
        
        # 更新时间
        from django.utils import timezone
        worker.last_seen = timezone.now()
        
        # 更新负载信息
        if request.data:
            worker.info = request.data
            
        worker.save()
        return Response({'status': 'ok'})
