"""
健康检查视图

提供 Docker 健康检查端点，无需认证。
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


class HealthCheckView(APIView):
    """
    健康检查端点
    
    GET /api/health/
    
    返回服务状态，用于 Docker 健康检查。
    此端点无需认证。
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({'status': 'ok'})
