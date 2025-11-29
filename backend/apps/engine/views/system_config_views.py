"""
系统配置 API Views
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.engine.services import SystemConfigService


class SystemConfigView(APIView):
    """
    系统配置 API
    
    GET: 获取系统配置
    PUT: 更新系统配置
    """
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SystemConfigService()
    
    def get(self, request):
        """获取系统配置"""
        public_ip = self.service.get_public_ip()
        return Response({
            'public_ip': public_ip
        })
    
    def put(self, request):
        """更新系统配置"""
        public_ip = (request.data.get('public_ip', '') or '').strip()

        try:
            public_ip = self.service.set_public_ip(public_ip)
        except ValueError as exc:
            # IP 校验失败，返回 400
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            'public_ip': public_ip
        })

