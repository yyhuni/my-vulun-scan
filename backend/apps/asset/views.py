import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, OperationalError

from .models import IPAddress
from .serializers import IPAddressListSerializer

logger = logging.getLogger(__name__)


class IPAddressViewSet(viewsets.ModelViewSet):
    """IP 地址管理 ViewSet"""
    
    queryset = IPAddress.objects.all()
    serializer_class = IPAddressListSerializer
    
    @action(detail=False, methods=['post', 'delete'])
    def bulk_delete(self, request):
        """
        批量删除 IP 地址记录
        
        请求参数:
        - ids: IP 地址 ID 列表 (list[int], 必填)
        
        示例请求:
        POST /api/ip-addresses/bulk-delete/
        {
            "ids": [1, 2, 3]
        }
        
        返回:
        - 删除结果和统计信息
        """
        # 获取请求数据
        ids = request.data.get('ids', [])
        
        # 参数验证
        if not ids:
            return Response(
                {'error': '缺少必填参数: ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not isinstance(ids, list):
            return Response(
                {'error': 'ids 必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not all(isinstance(id_val, int) for id_val in ids):
            return Response(
                {'error': 'ids 数组中的所有元素必须是整数'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 批量删除 IP 地址
            deleted_count, _ = IPAddress.objects.filter(id__in=ids).delete()
            
            logger.info(
                "批量删除 IP 地址成功 - 数量: %d, IDs: %s",
                deleted_count,
                ids
            )
            
            return Response(
                {
                    'message': f'已成功删除 {deleted_count} 个 IP 地址',
                    'deleted_count': deleted_count,
                    'requested_ids': ids
                },
                status=status.HTTP_200_OK
            )
            
        except (DatabaseError, IntegrityError, OperationalError) as e:
            # 数据库错误
            logger.error("批量删除 IP 地址时数据库错误: %s", str(e))
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        except Exception as e:
            # 其他未预期的错误
            logger.error("批量删除 IP 地址时未知错误: %s", str(e), exc_info=True)
            return Response(
                {'error': '服务器内部错误'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
