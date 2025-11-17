import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, OperationalError

from .serializers import IPAddressListSerializer, SubdomainListSerializer, WebSiteSerializer, DirectorySerializer
from .services import IPAddressService, SubdomainService, WebSiteService, DirectoryService

logger = logging.getLogger(__name__)


class IPAddressViewSet(viewsets.ModelViewSet):
    """IP 地址管理 ViewSet"""
    
    serializer_class = IPAddressListSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = IPAddressService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
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
            # 通过 Service 层批量删除 IP 地址
            deleted_count, message = self.service.bulk_delete(ids)
            
            return Response(
                {
                    'message': message,
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


class SubdomainViewSet(viewsets.ModelViewSet):
    """子域名管理 ViewSet"""
    
    serializer_class = SubdomainListSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除子域名记录（支持单个或多个）
        
        请求参数:
        - ids: 子域名 ID 列表 (list[int], 必填)
          - 单个删除: {"ids": [1]}
          - 批量删除: {"ids": [1, 2, 3]}
        
        示例请求:
        POST /api/subdomains/bulk-delete/
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
            # 通过 Service 层批量删除子域名
            deleted_count, message = self.service.bulk_delete(ids)
            
            return Response(
                {
                    'message': message,
                    'deleted_count': deleted_count,
                    'requested_ids': ids
                },
                status=status.HTTP_200_OK
            )
            
        except (DatabaseError, IntegrityError, OperationalError) as e:
            # 数据库错误
            logger.error("批量删除子域名时数据库错误: %s", str(e))
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        except Exception as e:
            # 其他未预期的错误
            logger.error("批量删除子域名时未知错误: %s", str(e), exc_info=True)
            return Response(
                {'error': '服务器内部错误'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebSiteViewSet(viewsets.ModelViewSet):
    """站点管理 ViewSet"""
    
    serializer_class = WebSiteSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = WebSiteService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除站点记录（支持单个或多个）
        
        请求参数:
        - ids: 站点 ID 列表 (list[int], 必填)
          - 单个删除: {"ids": [1]}
          - 批量删除: {"ids": [1, 2, 3]}
        
        示例请求:
        POST /api/websites/bulk-delete/
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
            # 通过 Service 层批量删除站点
            deleted_count, message = self.service.bulk_delete(ids)
            
            return Response(
                {
                    'message': message,
                    'deleted_count': deleted_count,
                    'requested_ids': ids
                },
                status=status.HTTP_200_OK
            )
            
        except (DatabaseError, IntegrityError, OperationalError) as e:
            # 数据库错误
            logger.error("批量删除站点时数据库错误: %s", str(e))
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        except Exception as e:
            # 其他未预期的错误
            logger.error("批量删除站点时未知错误: %s", str(e), exc_info=True)
            return Response(
                {'error': '服务器内部错误'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DirectoryViewSet(viewsets.ModelViewSet):
    """目录管理 ViewSet"""
    
    serializer_class = DirectorySerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = DirectoryService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除目录记录（支持单个或多个）
        
        请求参数:
        - ids: 目录 ID 列表 (list[int], 必填)
          - 单个删除: {"ids": [1]}
          - 批量删除: {"ids": [1, 2, 3]}
        
        示例请求:
        POST /api/directories/bulk-delete/
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
            # 通过 Service 层批量删除目录
            deleted_count, message = self.service.bulk_delete(ids)
            
            return Response(
                {
                    'message': message,
                    'deleted_count': deleted_count,
                    'requested_ids': ids
                },
                status=status.HTTP_200_OK
            )
            
        except (DatabaseError, IntegrityError, OperationalError) as e:
            # 数据库错误
            logger.error("批量删除目录时数据库错误: %s", str(e))
            return Response(
                {'error': '数据库错误，请稍后重试'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        except Exception as e:
            # 其他未预期的错误
            logger.error("批量删除目录时未知错误: %s", str(e), exc_info=True)
            return Response(
                {'error': '服务器内部错误'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
