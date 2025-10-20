"""
资产管理视图
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count

from apps.common.pagination import CustomPageNumberPagination
from .models import Organization, Domain, Subdomain
from .serializers import (
    OrganizationListSerializer,
    OrganizationDetailSerializer,
    OrganizationCreateUpdateSerializer,
)


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    组织管理视图集
    
    提供组织的 CRUD 操作：
    - list: 获取组织列表
    - retrieve: 获取组织详情
    - create: 创建组织
    - update: 更新组织
    - partial_update: 部分更新组织
    - destroy: 删除组织
    - add_domains: 添加域名到组织
    - remove_domains: 从组织移除域名
    """
    queryset = Organization.objects.all().order_by('-updated_at')
    pagination_class = CustomPageNumberPagination
    
    def get_serializer_class(self):
        """根据不同的 action 返回不同的序列化器"""
        if self.action == 'list':
            return OrganizationListSerializer
        elif self.action == 'retrieve':
            return OrganizationDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return OrganizationCreateUpdateSerializer
        return OrganizationListSerializer
    
    def get_queryset(self):
        """
        获取查询集，支持搜索
        """
        queryset = super().get_queryset()
        
        # 搜索功能
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """创建组织"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # 返回详情序列化器
        detail_serializer = OrganizationDetailSerializer(instance)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """更新组织"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        
        # 返回详情序列化器
        detail_serializer = OrganizationDetailSerializer(instance)
        return Response(detail_serializer.data)
    
    @action(detail=True, methods=['post'], url_path='add-domains')
    def add_domains(self, request, pk=None):
        """
        添加域名到组织
        
        请求体：
        {
            "domain_ids": [1, 2, 3]
        }
        """
        organization = self.get_object()
        domain_ids = request.data.get('domain_ids', [])
        
        if not domain_ids:
            return Response(
                {'detail': 'domain_ids 不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 验证域名是否存在
        domains = Domain.objects.filter(id__in=domain_ids)
        if domains.count() != len(domain_ids):
            existing_ids = set(domains.values_list('id', flat=True))
            invalid_ids = set(domain_ids) - existing_ids
            return Response(
                {'detail': f'域名 ID {invalid_ids} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 添加域名
        organization.domains.add(*domains)
        
        # 返回更新后的组织详情
        serializer = OrganizationDetailSerializer(organization)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='remove-domains')
    def remove_domains(self, request, pk=None):
        """
        从组织移除域名
        
        请求体：
        {
            "domain_ids": [1, 2, 3]
        }
        """
        organization = self.get_object()
        domain_ids = request.data.get('domain_ids', [])
        
        if not domain_ids:
            return Response(
                {'detail': 'domain_ids 不能为空'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 移除域名
        organization.domains.remove(*domain_ids)
        
        # 返回更新后的组织详情
        serializer = OrganizationDetailSerializer(organization)
        return Response(serializer.data)
