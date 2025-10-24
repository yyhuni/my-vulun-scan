"""
资产管理视图
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Organization, Asset, Domain
from .serializers import (
    OrganizationSerializer,
    OrganizationDetailSerializer,
    AssetSerializer,
    AssetListSerializer,
    DomainSerializer,
    BulkCreateAssetSerializer
)
from apps.common.pagination import OrganizationPagination, DomainPagination


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    组织管理视图集
    """
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    pagination_class = OrganizationPagination
    
    def get_serializer_class(self):
        """
        根据 action 返回不同的序列化器
        - retrieve/list: 返回带 assets 的序列化器
        - 其他: 返回不带 assets 的基础序列化器
        """
        if self.action in ['retrieve', 'list']:
            return OrganizationDetailSerializer
        return OrganizationSerializer
    
    def get_queryset(self):
        """
        根据 action 优化查询
        - retrieve/list: 预加载 assets，避免 N+1 查询
        - 其他: 使用基础查询
        """
        queryset = super().get_queryset()
        if self.action in ['retrieve', 'list']:
            queryset = queryset.prefetch_related('assets')
        return queryset
    
    @action(detail=False, methods=['post'], url_path='batch_delete')
    def batch_delete(self, request):
        """
        批量删除组织
        
        请求体格式:
        {
            "organizationIds": [1, 2, 3]
        }
        
        返回格式:
        {
            "message": "成功删除 3 个组织",
            "deletedOrganizationCount": 3
        }
        
        说明:
        - message: 操作结果描述
        - deletedOrganizationCount: 删除的组织数量
        
        注意:
        - 删除组织不会删除资产实体，只会清理 organization_assets 关联表
        - 资产可能成为未分组资产，但仍然可以正常使用
        - 域名、URL 等数据完全不受影响
        """
        organization_ids = request.data.get('organization_ids')  # 拦截器会自动转换
        
        if not organization_ids or not isinstance(organization_ids, list):
            return Response(
                {'error': 'organizationIds 是必需的，且必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 批量删除组织（只删除组织实体和关联表记录，不删除资产）
        deleted_count, _ = Organization.objects.filter(id__in=organization_ids).delete()
        
        return Response({
            'message': f'成功删除 {deleted_count} 个组织',
            'deletedOrganizationCount': deleted_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='assets/unlink')
    def unlink_asset(self, request, pk=None):
        """
        解除组织与资产的关联（只删除 organization_assets 中间表的记录）
        
        路由: POST /api/organizations/{organization_id}/assets/unlink/
        
        请求体格式:
        {
            "assetId": 23
        }
        
        返回格式:
        {
            "message": "成功解除资产关联"
        }
        
        说明:
        - 只解除关联关系，不删除资产实体和组织实体
        - 资产会变成未分组状态，但数据完整保留
        """
        asset_id = request.data.get('asset_id')  # 拦截器会自动转换
        
        if not asset_id:
            return Response(
                {'error': 'assetId 是必需的'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取组织对象
        organization = self.get_object()
        
        # 直接删除中间表记录，通过删除行数判断是否成功（只需1次数据库操作）
        deleted_count, _ = organization.assets.through.objects.filter(
            organization_id=organization.id,
            asset_id=asset_id
        ).delete()
        
        if deleted_count == 0:
            return Response(
                {'error': f'资产不存在或未关联到该组织'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'message': '成功解除资产关联'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'], url_path='domains')
    def list_domains(self, request, pk=None):
        """
        获取组织下所有资产的域名列表
        
        路由: GET /api/organizations/{organization_id}/domains/
        
        查询参数:
        - page: 页码
        - page_size: 每页数量
        
        返回格式:
        {
            "count": 100,
            "next": "http://...",
            "previous": null,
            "results": [
                {
                    "id": 1,
                    "name": "api.example.com",
                    "asset": 5,
                    "created_at": "2024-01-01T00:00:00Z",
                    "updated_at": "2024-01-01T00:00:00Z"
                }
            ]
        }
        
        说明:
        - 查询该组织关联的所有资产
        - 返回这些资产下的所有域名
        - 支持分页
        """
        # 获取组织对象
        organization = self.get_object()
        
        # 获取组织关联的所有资产ID
        asset_ids = organization.assets.values_list('id', flat=True)
        
        # 查询这些资产下的所有域名
        queryset = Domain.objects.filter(asset_id__in=asset_ids).select_related('asset')
        
        # 分页
        paginator = DomainPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = DomainSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = DomainSerializer(queryset, many=True)
        return Response(serializer.data)
    

class AssetViewSet(viewsets.ModelViewSet):
    """
    资产管理视图集
    """
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    pagination_class = DomainPagination
    
    def get_serializer_class(self):
        """
        根据 action 返回不同的序列化器
        - list: 返回带 organizations 的序列化器
        - 其他: 返回不带 organizations 的基础序列化器
        """
        if self.action == 'list':
            return AssetListSerializer
        return AssetSerializer
    
    def get_queryset(self):
        """
        根据 action 优化查询
        - list: 预加载 organizations，避免 N+1 查询
        - 其他: 使用基础查询
        """
        queryset = super().get_queryset()
        if self.action == 'list':
            queryset = queryset.prefetch_related('organizations')
        return queryset
    
    
    @action(detail=False, methods=['post'], url_path='create')
    def bulk_create(self, request):
        """
        批量创建资产并关联到组织
        
        请求体格式:
        {
            "assets": [
                {"name": "test.com", "description": "域名示例"},
                {"name": "192.168.1.1", "description": "IP 示例"},
                {"name": "10.0.0.0/8", "description": "CIDR 网段示例"}
            ],
            "organizationId": 9
        }
        
        注意：
        - type 字段由后端自动识别，前端无需提供
        - 支持的类型：domain（域名）、ip（IP地址）、cidr（网段）
        
        核心流程：
        1. 验证组织存在性并获取对象
        2. 去重请求中的资产（FIFO 策略，按 name 去重，name 字段有 unique 约束）
        3. 事务处理：
           - 查询已存在的资产集合（按 name 查询）
           - INSERT assets (ignore_conflicts)
           - SELECT 查询所有资产对象并缓存到内存
           - 计算新建数量（内存操作）
           - INSERT domains (仅为 type=domain 的资产创建根域名，ignore_conflicts)
           - INSERT organization_assets (ignore_conflicts)
        """
        # 验证请求数据
        serializer = BulkCreateAssetSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': '请求数据格式错误', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        assets_data = validated_data['assets']
        organization_id = validated_data['organization_id']
        
        # 步骤1: 验证组织存在性并获取对象供后续使用
        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return Response(
                {'error': f'组织 ID {organization_id} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 步骤2: 去重请求中的资产（FIFO 策略：保留第一次出现）
        # 注意：资产名称已经在序列化器中规范化（小写、去空格、去末尾点）
        # type 字段在序列化器中已自动识别并填充
        # 使用 name 作为 key（name 字段有 unique 约束）
        asset_map = {}
        for asset_data in assets_data:
            asset_map.setdefault(
                asset_data['name'],  # name 作为 key
                {
                    'name': asset_data['name'],
                    'description': asset_data.get('description', ''),
                    'type': asset_data['type']  # type 已在序列化器中自动识别
                }
            )
        
        # 步骤3: 使用事务处理批量创建和关联
        with transaction.atomic():
            # 提取所有的 name
            asset_names = list(asset_map.keys())
            
            # 步骤3.1: 查询已存在的资产集合（按 name 查询，name 字段有 unique 约束）
            existing_asset_names = set(
                Asset.objects.filter(name__in=asset_names).values_list('name', flat=True)
            )
            
            # 步骤3.2: 批量插入资产（ignore_conflicts 自动忽略已存在）
            assets_to_create = [
                Asset(name=asset_info['name'], description=asset_info['description'], type=asset_info['type'])
                for asset_info in asset_map.values()
            ]
            
            if assets_to_create:
                Asset.objects.bulk_create(assets_to_create, ignore_conflicts=True)
            
            # 步骤3.3: 查询所有资产对象（包括已存在和新创建的），转为 list 缓存结果避免后续操作触发额外查询
            all_assets = list(Asset.objects.filter(name__in=asset_names))
            
            # 计算实际新创建的资产数量（使用集合操作，更准确）
            count_existed = len(existing_asset_names)
            count_created = len(asset_names) - count_existed
            
            # 步骤3.4: 为所有 domain 类型的资产创建根域名（ignore_conflicts 自动忽略已存在）
            domains_to_create = [
                Domain(name=asset.name, asset_id=asset.id)
                for asset in all_assets
                if asset.type == 'domain'  # 只为 domain 类型创建根域名
            ]
            
            if domains_to_create:
                Domain.objects.bulk_create(domains_to_create, ignore_conflicts=True)
            
            # 步骤3.5: 批量关联到组织（add 方法自动忽略已存在的关联）
            organization.assets.add(*all_assets)
        
        # 返回统计信息
        count_requested = len(asset_map)
        
        # 返回统计信息
        response_data = {
            'message': f'成功处理 {count_requested} 个资产，新创建 {count_created} 个，{count_existed} 个已存在',
            'requestedCount': count_requested,
            'createdCount': count_created,
            'existedCount': count_existed
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    


class DomainViewSet(viewsets.ModelViewSet):
    """
    域名管理视图集
    """
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    pagination_class = DomainPagination