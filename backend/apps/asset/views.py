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
    
    def destroy(self, request, *args, **kwargs):
        """
        删除单个子域名（复用批量删除逻辑）
        
        DELETE /api/subdomains/{id}/
        
        功能:
        - 复用 bulk_delete 的两阶段删除逻辑
        - 立即返回 200 OK，软删除完成，硬删除在后台执行
        
        返回:
        - 200 OK: 软删除完成，硬删除已在后台启动
        - 404 Not Found: 子域名不存在
        
        注意:
        - 两阶段删除：软删除（立即）+ 硬删除（后台 Prefect）
        - 硬删除会使用分批删除策略处理大数据量
        """
        try:
            from apps.asset.models import Subdomain
            from rest_framework.exceptions import NotFound, APIException
            
            subdomain = self.get_object()
            
            # 直接调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.service.delete_subdomains_two_phase([subdomain.id])
            
            return Response({
                'message': f'已删除子域名: {subdomain.name}',
                'subdomainId': subdomain.id,
                'subdomainName': subdomain.name,
                'deletedCount': result['soft_deleted_count'],
                'deletedSubdomains': result['subdomain_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except Subdomain.DoesNotExist:
            raise NotFound('子域名不存在')
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除子域名时发生错误")
            raise APIException('服务器错误，请稍后重试')
    
    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除子域名（两阶段删除策略）
        
        POST/DELETE /api/subdomains/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        两阶段删除策略：
        1. 阶段 1（立即）：软删除子域名，用户立即看不到数据
        2. 阶段 2（后台）：Prefect Flow 硬删除，真正清理数据
        
        功能:
        - 立即软删除：用户立即看不到数据（响应快）
        - Prefect 硬删除：后台执行，使用分批删除策略处理大数据量
        - 自动重试：Prefect Task 自动重试失败的删除操作
        
        返回:
        - 200 OK: 软删除成功，硬删除已提交到 Prefect
        - 400 Bad Request: 参数错误
        - 404 Not Found: 未找到子域名
        
        注意:
        - 软删除：数据可恢复（deleted_at 不为 NULL）
        - 硬删除：数据不可恢复（真正从数据库删除）
        - 使用 Prefect Flow 管理删除流程，可在 Prefect UI 查看进度
        """
        from rest_framework.exceptions import ValidationError, NotFound, APIException
        
        ids = request.data.get('ids', [])
        
        # 参数验证
        if not ids:
            raise ValidationError('缺少必填参数: ids')
        if not isinstance(ids, list):
            raise ValidationError('ids 必须是数组')
        if not all(isinstance(i, int) for i in ids):
            raise ValidationError('ids 数组中的所有元素必须是整数')
        
        try:
            # 调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.service.delete_subdomains_two_phase(ids)
            
            return Response({
                'message': f"已删除 {result['soft_deleted_count']} 个子域名",
                'deletedCount': result['soft_deleted_count'],
                'deletedSubdomains': result['subdomain_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("批量删除子域名时发生错误")
            raise APIException('服务器错误，请稍后重试')


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
