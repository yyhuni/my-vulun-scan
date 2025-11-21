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
    
    def destroy(self, request, *args, **kwargs):
        """
        删除单个 IP 地址（复用批量删除逻辑）
        
        DELETE /api/ip-addresses/{id}/
        
        功能:
        - 复用 bulk_delete 的两阶段删除逻辑
        - 立即返回 200 OK，软删除完成，硬删除在后台执行
        
        返回:
        - 200 OK: 软删除完成，硬删除已在后台启动
        - 404 Not Found: IP 地址不存在
        """
        try:
            from apps.asset.models.asset_models import IPAddress
            from rest_framework.exceptions import NotFound, APIException
            
            instance = self.get_object()
            
            # 直接调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.service.delete_ip_addresses_two_phase([instance.id])
            
            return Response({
                'message': f'已删除 IP 地址: {instance.ip}',
                'ipAddressId': instance.id,
                'ipAddress': instance.ip,
                'deletedCount': result['soft_deleted_count'],
                'deletedIPAddresses': result['ip_address_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except IPAddress.DoesNotExist:
            raise NotFound('IP 地址不存在')
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除 IP 地址时发生错误")
            raise APIException('服务器错误，请稍后重试')

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除 IP 地址（两阶段删除策略）
        
        POST/DELETE /api/ip-addresses/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        两阶段删除策略：
        1. 阶段 1（立即）：软删除 IP 地址，用户立即看不到数据
        2. 阶段 2（后台）：Prefect Flow 硬删除，真正清理数据
        
        功能:
        - 立即软删除：用户立即看不到数据（响应快）
        - Prefect 硬删除：后台执行，使用分批删除策略处理大数据量
        - 自动重试：Prefect Task 自动重试失败的删除操作
        
        返回:
        - 200 OK: 软删除成功，硬删除已提交到 Prefect
        - 400 Bad Request: 参数错误
        - 404 Not Found: 未找到 IP 地址
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
            result = self.service.delete_ip_addresses_two_phase(ids)
            
            return Response({
                'message': f"已删除 {result['soft_deleted_count']} 个 IP 地址",
                'deletedCount': result['soft_deleted_count'],
                'deletedIPAddresses': result['ip_address_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("批量删除 IP 地址时发生错误")
            raise APIException('服务器错误，请稍后重试')


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
            from apps.asset.models.asset_models import Subdomain
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
    
    def destroy(self, request, *args, **kwargs):
        """
        删除单个站点（复用批量删除逻辑）
        
        DELETE /api/websites/{id}/
        
        功能:
        - 复用 bulk_delete 的两阶段删除逻辑
        - 立即返回 200 OK，软删除完成，硬删除在后台执行
        
        返回:
        - 200 OK: 软删除完成，硬删除已在后台启动
        - 404 Not Found: 站点不存在
        """
        try:
            from apps.asset.models.asset_models import WebSite
            from rest_framework.exceptions import NotFound, APIException
            
            instance = self.get_object()
            
            # 直接调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.service.delete_websites_two_phase([instance.id])
            
            return Response({
                'message': f'已删除站点: {instance.url}',
                'websiteId': instance.id,
                'websiteUrl': instance.url,
                'deletedCount': result['soft_deleted_count'],
                'deletedWebSites': result['website_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except WebSite.DoesNotExist:
            raise NotFound('站点不存在')
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除站点时发生错误")
            raise APIException('服务器错误，请稍后重试')

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除站点（两阶段删除策略）
        
        POST/DELETE /api/websites/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        两阶段删除策略：
        1. 阶段 1（立即）：软删除站点，用户立即看不到数据
        2. 阶段 2（后台）：Prefect Flow 硬删除，真正清理数据
        
        功能:
        - 立即软删除：用户立即看不到数据（响应快）
        - Prefect 硬删除：后台执行，使用分批删除策略处理大数据量
        - 自动重试：Prefect Task 自动重试失败的删除操作
        
        返回:
        - 200 OK: 软删除成功，硬删除已提交到 Prefect
        - 400 Bad Request: 参数错误
        - 404 Not Found: 未找到站点
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
            result = self.service.delete_websites_two_phase(ids)
            
            return Response({
                'message': f"已删除 {result['soft_deleted_count']} 个站点",
                'deletedCount': result['soft_deleted_count'],
                'deletedWebSites': result['website_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("批量删除站点时发生错误")
            raise APIException('服务器错误，请稍后重试')


class DirectoryViewSet(viewsets.ModelViewSet):
    """目录管理 ViewSet"""
    
    serializer_class = DirectorySerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = DirectoryService()
    
    def get_queryset(self):
        """通过 Service 层获取查询集"""
        return self.service.get_all()
    
    def destroy(self, request, *args, **kwargs):
        """
        删除单个目录（复用批量删除逻辑）
        
        DELETE /api/directories/{id}/
        
        功能:
        - 复用 bulk_delete 的两阶段删除逻辑
        - 立即返回 200 OK，软删除完成，硬删除在后台执行
        
        返回:
        - 200 OK: 软删除完成，硬删除已在后台启动
        - 404 Not Found: 目录不存在
        """
        try:
            from apps.asset.models.asset_models import Directory
            from rest_framework.exceptions import NotFound, APIException
            
            instance = self.get_object()
            
            # 直接调用 Service 层的业务方法（软删除 + 提交 Prefect Flow）
            result = self.service.delete_directories_two_phase([instance.id])
            
            return Response({
                'message': f'已删除目录: {instance.url}',
                'directoryId': instance.id,
                'directoryUrl': instance.url,
                'deletedCount': result['soft_deleted_count'],
                'deletedDirectories': result['directory_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except Directory.DoesNotExist:
            raise NotFound('目录不存在')
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("删除目录时发生错误")
            raise APIException('服务器错误，请稍后重试')

    @action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """
        批量删除目录（两阶段删除策略）
        
        POST/DELETE /api/directories/bulk-delete/
        
        请求格式:
        {
            "ids": [1, 2, 3]
        }
        
        两阶段删除策略：
        1. 阶段 1（立即）：软删除目录，用户立即看不到数据
        2. 阶段 2（后台）：Prefect Flow 硬删除，真正清理数据
        
        功能:
        - 立即软删除：用户立即看不到数据（响应快）
        - Prefect 硬删除：后台执行，使用分批删除策略处理大数据量
        - 自动重试：Prefect Task 自动重试失败的删除操作
        
        返回:
        - 200 OK: 软删除成功，硬删除已提交到 Prefect
        - 400 Bad Request: 参数错误
        - 404 Not Found: 未找到目录
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
            result = self.service.delete_directories_two_phase(ids)
            
            return Response({
                'message': f"已删除 {result['soft_deleted_count']} 个目录",
                'deletedCount': result['soft_deleted_count'],
                'deletedDirectories': result['directory_names'],
                'detail': {
                    'phase1': '软删除完成，用户已看不到数据',
                    'phase2': '硬删除已提交到 Prefect，将在后台执行'
                }
            }, status=status.HTTP_200_OK)
        
        except ValueError as e:
            raise NotFound(str(e))
        except Exception as e:
            logger.exception("批量删除目录时发生错误")
            raise APIException('服务器错误，请稍后重试')
