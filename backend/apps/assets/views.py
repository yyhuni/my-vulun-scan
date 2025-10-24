"""
资产管理视图
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Organization, Asset, Domain, Endpoint
from .serializers import (
    OrganizationSerializer,
    OrganizationDetailSerializer,
    AssetSerializer,
    AssetListSerializer,
    DomainSerializer,
    EndpointSerializer,
    BulkCreateAssetSerializer,
    BulkCreateDomainSerializer,
    BulkCreateEndpointSerializer
)
from apps.common.pagination import OrganizationPagination, DomainPagination, AssetPagination, EndpointPagination


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
        - 域名、Endpoint 等数据完全不受影响
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
    pagination_class = AssetPagination
    
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

    @action(detail=False, methods=['post'], url_path='batch-delete')
    def batch_delete(self, request):
        """
        批量删除资产

        路由: POST /api/assets/batch-delete/

        请求体格式:
        {
            "assetIds": [1, 2, 3]
        }

        返回格式:
        {
            "message": "成功删除 3 个资产（级联删除 10 个域名）",
            "deletedAssetCount": 3,
            "deletedDomainCount": 10
        }

        说明:
        - 删除资产会级联删除所有关联的域名（通过 ForeignKey on_delete=CASCADE）
        - 同时会清理 organization_assets 关联表
        - 删除操作在事务中执行，保证数据一致性
        """
        # 拦截器会自动将 assetIds 转换为 asset_ids
        asset_ids = request.data.get('asset_ids')

        if not asset_ids or not isinstance(asset_ids, list):
            return Response(
                {'error': 'assetIds 是必需的，且必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 使用事务确保删除操作的原子性
        with transaction.atomic():
            # 批量删除资产
            # Django 的 delete() 会自动处理级联删除（ForeignKey on_delete=CASCADE）
            # 同时会清理 ManyToMany 关联表（organization_assets）
            deleted_count, deleted_objects = Asset.objects.filter(id__in=asset_ids).delete()

            # deleted_objects 是一个字典，包含了所有被删除的对象统计
            # 例如: {'assets.Asset': 3, 'assets.Domain': 10, 'assets.Organization_assets': 5}
            asset_label = Asset._meta.label
            domain_label = Domain._meta.label
            deleted_asset_count = deleted_objects.get(asset_label, 0)
            deleted_domain_count = deleted_objects.get(domain_label, 0)

        return Response({
            'message': f'成功删除 {deleted_asset_count} 个资产（级联删除 {deleted_domain_count} 个域名）',
            'deletedAssetCount': deleted_asset_count,
            'deletedDomainCount': deleted_domain_count
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='domains')
    def list_domains(self, request, pk=None):
        """
        获取资产的域名列表

        路由: GET /api/assets/{asset_id}/domains/

        查询参数:
        - page: 页码
        - page_size: 每页数量

        返回格式:
        {
            "domains": [...],
            "total": 100,
            "page": 1,
            "page_size": 10,
            "total_pages": 10
        }
        """
        # 获取资产对象
        asset = self.get_object()

        # 查询该资产的所有域名
        queryset = asset.domains.all()

        # 分页
        paginator = DomainPagination()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = DomainSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = DomainSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path='endpoints')
    def list_endpoints(self, request, pk=None):
        """
        获取资产的所有 Endpoint 列表

        路由: GET /api/assets/{asset_id}/endpoints/

        查询参数:
        - page: 页码
        - page_size: 每页数量

        返回格式:
        {
            "endpoints": [...],
            "total": 100,
            "page": 1,
            "page_size": 10,
            "total_pages": 10
        }

        说明:
        - 查询该资产下所有 Endpoint（通过 asset_id 冗余字段直接查询）
        """
        # 获取资产对象
        asset = self.get_object()

        # 直接通过 asset_id 查询 Endpoint（利用冗余字段优化性能）
        queryset = Endpoint.objects.filter(asset_id=asset.id).select_related('domain')

        # 分页
        paginator = EndpointPagination()
        page = paginator.paginate_queryset(queryset, request)

        if page is not None:
            serializer = EndpointSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = EndpointSerializer(queryset, many=True)
        return Response(serializer.data)


class DomainViewSet(viewsets.ModelViewSet):
    """
    域名管理视图集
    """
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    pagination_class = DomainPagination
    
    @action(detail=False, methods=['post'], url_path='create')
    def bulk_create(self, request):
        """
        批量创建域名并绑定到资产
        
        路由: POST /api/domains/create/
        
        请求体格式:
        {
            "domains": [
                {"name": "api.example.com"},
                {"name": "www.example.com"},
                {"name": "admin.example.com"}
            ],
            "assetId": 5
        }
        
        返回格式（成功）:
        {
            "message": "成功处理 3 个域名，新创建 2 个，1 个已存在，1 个已跳过",
            "requestedCount": 3,
            "createdCount": 2,
            "existedCount": 1,
            "skippedCount": 1,
            "skippedDomains": [
                {
                    "name": "test.other.com",
                    "reason": "不是 example.com 的子域名"
                }
            ]
        }
        
        核心流程：
        1. 验证资产存在性
        2. 验证资产类型必须为 domain
        3. 验证每个域名是否为资产的子域名（无效的域名会被跳过，不会报错）
        4. 验证请求数据
        5. 事务处理：
           - 查询已存在的域名集合
           - 批量插入域名 (ignore_conflicts 自动忽略已存在)
           - 计算新建数量
        
        注意：
        - 资产类型必须为 domain（如果不是会返回错误）
        - 域名必须是资产的子域名（如资产为 example.com，域名可以是 api.example.com、www.example.com 或 example.com 本身）
        - 不是子域名的域名会被跳过，不会导致整个请求失败
        - 返回结果中会包含跳过的域名列表和原因
        """
        # 验证请求数据
        serializer = BulkCreateDomainSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': '请求数据格式错误', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        domains_data = validated_data['domains']
        asset_id = validated_data['asset_id']
        
        # 步骤1: 验证资产存在性
        try:
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': f'资产 ID {asset_id} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 步骤1.1: 验证资产类型必须为 domain
        if asset.type != 'domain':
            return Response(
                {'error': f'资产类型必须为 domain，当前资产类型为 {asset.type}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 步骤2: 去重请求中的域名（FIFO 策略：保留第一次出现）
        # 同时验证每个域名是否为资产的子域名，跳过无效的域名
        domain_map = {}
        skipped_domains = []
        
        for domain_data in domains_data:
            domain_name = domain_data['name']
            
            # 验证域名是否为资产的子域名
            # 例如：资产名为 example.com，域名必须以 .example.com 结尾或等于 example.com
            if domain_name != asset.name and not domain_name.endswith('.' + asset.name):
                skipped_domains.append({
                    'name': domain_name,
                    'reason': f'不是 {asset.name} 的子域名'
                })
                continue
            
            domain_map.setdefault(
                domain_name,  # name 作为 key
                {'name': domain_name}
            )
        
        # 步骤3: 使用事务处理批量创建
        with transaction.atomic():
            # 提取所有的 name
            domain_names = list(domain_map.keys())
            
            # 步骤3.1: 查询已存在的域名集合（按 name 查询）
            existing_domain_names = set(
                Domain.objects.filter(
                    name__in=domain_names
                ).values_list('name', flat=True)
            )
            
            # 步骤3.2: 批量插入域名 (ignore_conflicts 自动忽略已存在)
            domains_to_create = [
                Domain(name=domain_info['name'], asset_id=asset_id)
                for domain_info in domain_map.values()
            ]
            
            if domains_to_create:
                Domain.objects.bulk_create(domains_to_create, ignore_conflicts=True)
            
            # 计算实际新创建的域名数量（使用集合操作，更准确）
            count_existed = len(existing_domain_names)
            count_created = len(domain_names) - count_existed
        
        # 返回统计信息
        count_requested = len(domain_map)
        count_skipped = len(skipped_domains)
        
        response_data = {
            'message': f'成功处理 {count_requested} 个域名，新创建 {count_created} 个，{count_existed} 个已存在，{count_skipped} 个已跳过',
            'requestedCount': count_requested,
            'createdCount': count_created,
            'existedCount': count_existed,
            'skippedCount': count_skipped,
            'skippedDomains': skipped_domains if skipped_domains else []
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)


class EndpointViewSet(viewsets.ModelViewSet):
    """
    Endpoint 管理视图集
    """
    queryset = Endpoint.objects.all()
    serializer_class = EndpointSerializer
    pagination_class = EndpointPagination
    
    def get_queryset(self):
        """
        优化查询，预加载关联对象
        """
        return Endpoint.objects.select_related('domain', 'asset')
    
    @action(detail=False, methods=['post'], url_path='create')
    def bulk_create(self, request):
        """
        批量创建 Endpoint 并绑定到域名和资产
        
        路由: POST /api/endpoints/create/
        
        请求体格式:
        {
            "endpoints": [
                {
                    "url": "https://api.example.com/v1/users",
                    "method": "GET",
                    "statusCode": 200,
                    "title": "User API",
                    "contentLength": 1024
                },
                {
                    "url": "https://api.example.com/v1/posts",
                    "method": "GET",
                    "statusCode": 200
                }
            ],
            "domainId": 5,
            "assetId": 3
        }
        
        返回格式（成功）:
        {
            "message": "成功处理 2 个 Endpoint，新创建 2 个，0 个已存在",
            "requestedCount": 2,
            "createdCount": 2,
            "existedCount": 0
        }
        
        核心流程：
        1. 验证域名和资产存在性
        2. 验证域名属于该资产
        3. 去重请求中的 Endpoint
        4. 事务处理：
           - 查询已存在的 Endpoint 集合
           - 批量插入 Endpoint (ignore_conflicts 自动忽略已存在)
           - 计算新建数量
        """
        # 验证请求数据
        serializer = BulkCreateEndpointSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': '请求数据格式错误', 'details': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        validated_data = serializer.validated_data
        endpoints_data = validated_data['endpoints']
        domain_id = validated_data['domain_id']
        asset_id = validated_data['asset_id']
        
        # 步骤1: 验证域名存在性
        try:
            domain = Domain.objects.get(id=domain_id)
        except Domain.DoesNotExist:
            return Response(
                {'error': f'域名 ID {domain_id} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 步骤2: 验证资产存在性
        try:
            asset = Asset.objects.get(id=asset_id)
        except Asset.DoesNotExist:
            return Response(
                {'error': f'资产 ID {asset_id} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 步骤3: 验证域名属于该资产
        if domain.asset_id != asset_id:
            return Response(
                {'error': f'域名 {domain.name} 不属于资产 {asset.name}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 步骤4: 去重请求中的 Endpoint（FIFO 策略：保留第一次出现）
        endpoint_map = {}
        for ep in endpoints_data:
            url_str = ep['url']
            endpoint_map.setdefault(
                url_str,
                {
                    'url': url_str,
                    'method': ep.get('method'),
                    'status_code': ep.get('status_code'),
                    'title': ep.get('title'),
                    'content_length': ep.get('content_length')
                }
            )
        
        # 步骤5: 使用事务处理批量创建
        with transaction.atomic():
            # 提取所有的 url
            url_strings = list(endpoint_map.keys())
            
            # 步骤5.1: 查询已存在的 Endpoint 集合
            existing_urls = set(
                Endpoint.objects.filter(
                    url__in=url_strings
                ).values_list('url', flat=True)
            )
            
            # 步骤5.2: 批量插入 Endpoint (ignore_conflicts 自动忽略已存在)
            endpoints_to_create = [
                Endpoint(
                    url=info['url'],
                    method=info['method'],
                    status_code=info['status_code'],
                    title=info['title'],
                    content_length=info['content_length'],
                    domain_id=domain_id,
                    asset_id=asset_id
                )
                for info in endpoint_map.values()
            ]
            
            if endpoints_to_create:
                Endpoint.objects.bulk_create(endpoints_to_create, ignore_conflicts=True)
            
            # 计算实际新创建的 Endpoint 数量
            count_existed = len(existing_urls)
            count_created = len(url_strings) - count_existed
        
        # 返回统计信息
        count_requested = len(endpoint_map)
        
        response_data = {
            'message': f'成功处理 {count_requested} 个 Endpoint，新创建 {count_created} 个，{count_existed} 个已存在',
            'requestedCount': count_requested,
            'createdCount': count_created,
            'existedCount': count_existed
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='batch-delete')
    def batch_delete(self, request):
        """
        批量删除 Endpoint
        
        路由: POST /api/endpoints/batch-delete/
        
        请求体格式:
        {
            "endpointIds": [1, 2, 3]
        }
        
        返回格式:
        {
            "message": "成功删除 3 个 Endpoint",
            "deletedEndpointCount": 3
        }
        """
        endpoint_ids = request.data.get('endpoint_ids')  # 拦截器会自动转换
        
        if not endpoint_ids or not isinstance(endpoint_ids, list):
            return Response(
                {'error': 'endpointIds 是必需的，且必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 批量删除 Endpoint
        deleted_count, _ = Endpoint.objects.filter(id__in=endpoint_ids).delete()
        
        return Response({
            'message': f'成功删除 {deleted_count} 个 Endpoint',
            'deletedEndpointCount': deleted_count
        }, status=status.HTTP_200_OK)