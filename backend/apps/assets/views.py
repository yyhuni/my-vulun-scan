"""
资产管理视图
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Organization, Domain, Subdomain
from .serializers import (
    OrganizationSerializer,
    OrganizationDetailSerializer,
    DomainSerializer,
    DomainListSerializer,
    SubdomainSerializer,
    BulkCreateDomainSerializer
)
from apps.common.pagination import OrganizationPagination, DomainPagination, SubdomainPagination


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
        - retrieve/list: 返回带 domains 的序列化器
        - 其他: 返回不带 domains 的基础序列化器
        """
        if self.action in ['retrieve', 'list']:
            return OrganizationDetailSerializer
        return OrganizationSerializer
    
    def get_queryset(self):
        """
        根据 action 优化查询
        - retrieve/list: 预加载 domains，避免 N+1 查询
        - 其他: 使用基础查询
        """
        queryset = super().get_queryset()
        if self.action in ['retrieve', 'list']:
            queryset = queryset.prefetch_related('domains')
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
        - 删除组织不会删除域名实体，只会清理 organization_domains 关联表
        - 域名可能成为未分组域名，但仍然可以正常使用
        - 子域名、URL 等数据完全不受影响
        """
        organization_ids = request.data.get('organization_ids')  # 拦截器会自动转换
        
        if not organization_ids or not isinstance(organization_ids, list):
            return Response(
                {'error': 'organizationIds 是必需的，且必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 批量删除组织（只删除组织实体和关联表记录，不删除域名）
        deleted_count, _ = Organization.objects.filter(id__in=organization_ids).delete()
        
        return Response({
            'message': f'成功删除 {deleted_count} 个组织',
            'deletedOrganizationCount': deleted_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='domains/remove')
    def remove_domain(self, request, pk=None):
        """
        解除组织与域名的关联
        
        路由: POST /api/organizations/{organization_id}/domains/remove/
        
        请求体格式:
        {
            "domainId": 23
        }
        
        返回格式:
        {
            "message": "成功解除域名关联"
        }
        
        说明:
        - 只解除关联关系，不删除域名实体和组织实体
        - 域名会变成未分组状态，但数据完整保留
        """
        domain_id = request.data.get('domain_id')  # 拦截器会自动转换
        
        if not domain_id:
            return Response(
                {'error': 'domainId 是必需的'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取组织对象
        organization = self.get_object()
        
        # 直接删除中间表记录，通过删除行数判断是否成功（只需1次数据库操作）
        deleted_count, _ = organization.domains.through.objects.filter(
            organization_id=organization.id,
            domain_id=domain_id
        ).delete()
        
        if deleted_count == 0:
            return Response(
                {'error': f'域名不存在或未关联到该组织'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response({
            'message': '成功解除域名关联'
        }, status=status.HTTP_200_OK)
    

class DomainViewSet(viewsets.ModelViewSet):
    """
    域名管理视图集
    """
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    pagination_class = DomainPagination
    
    def get_serializer_class(self):
        """
        根据 action 返回不同的序列化器
        - list: 返回带 organizations 的序列化器
        - 其他: 返回不带 organizations 的基础序列化器
        """
        if self.action == 'list':
            return DomainListSerializer
        return DomainSerializer
    
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
    
    def update(self, request, *args, **kwargs):
        """
        重写更新方法，当域名 name 变更时，同步更新根子域名的 name
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_name = instance.name  # 保存旧的域名
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # 如果域名 name 发生了变化，同步更新根子域名
        new_name = serializer.instance.name
        if old_name != new_name:
            # 更新根子域名的 name（根子域名应该与域名同名）
            Subdomain.objects.filter(
                domain=instance,
                is_root=True
            ).update(name=new_name)
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='create')
    def bulk_create(self, request):
        """
        批量创建域名并关联到组织
        
        请求体格式:
        {
            "domains": [
                {"name": "test.com", "description": "描述"},
                {"name": "example.com", "description": "描述"}
            ],
            "organizationId": 9
        }
        
        核心流程：
        1. 验证组织存在性并获取对象
        2. 去重请求中的域名（FIFO 策略）
        3. 事务处理：
           - COUNT 统计插入前数量
           - INSERT domains (ignore_conflicts)
           - SELECT 查询所有域名对象并缓存到内存
           - 计算新建数量（内存操作）
           - INSERT subdomains (ignore_conflicts)
           - INSERT organization_domains (ignore_conflicts)
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
        organization_id = validated_data['organization_id']
        
        # 步骤1: 验证组织存在性并获取对象供后续使用
        try:
            organization = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist:
            return Response(
                {'error': f'组织 ID {organization_id} 不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 步骤2: 去重请求中的域名（FIFO 策略：保留第一次出现）
        # 注意：域名已经在序列化器中规范化（小写、去空格、去末尾点）
        domain_map = {}
        for domain_data in domains_data:
            domain_map.setdefault(
                domain_data['name'],  # 已经是规范化后的域名
                domain_data.get('description', '')
            )
        
        # 步骤3: 使用事务处理批量创建和关联
        with transaction.atomic():
            domain_names = list(domain_map.keys())
            
            # 步骤3.1: 查询已存在的域名集合
            existing_domain_names = set(
                Domain.objects.filter(name__in=domain_names).values_list('name', flat=True)
            )
            
            # 步骤3.2: 批量插入域名（ignore_conflicts 自动忽略已存在）
            domains_to_create = [
                Domain(name=name, description=desc)
                for name, desc in domain_map.items()
            ]
            
            if domains_to_create:
                Domain.objects.bulk_create(domains_to_create, ignore_conflicts=True)
            
            # 步骤3.3: 查询所有域名对象（包括已存在和新创建的），转为 list 缓存结果避免后续操作触发额外查询
            all_domains = list(Domain.objects.filter(name__in=domain_names))
            
            # 计算实际新创建的域名数量（使用集合操作，更准确）
            count_existed = len(existing_domain_names)
            count_created = len(domain_names) - count_existed
            
            # 步骤3.4: 为所有域名创建根子域名（ignore_conflicts 自动忽略已存在）
            subdomains_to_create = [
                Subdomain(name=domain.name, domain_id=domain.id, is_root=True)
                for domain in all_domains
            ]
            
            if subdomains_to_create:
                Subdomain.objects.bulk_create(subdomains_to_create, ignore_conflicts=True)
            
            # 步骤3.5: 批量关联到组织（add 方法自动忽略已存在的关联）
            organization.domains.add(*all_domains)
        
        # 返回统计信息
        count_requested = len(domain_map)
        
        # 返回统计信息
        response_data = {
            'message': f'成功处理 {count_requested} 个域名，新创建 {count_created} 个，{count_existed} 个已存在',
            'requestedCount': count_requested,
            'createdCount': count_created,
            'existedCount': count_existed
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], url_path='batch-delete')
    def batch_delete(self, request):
        """
        批量删除域名（自定义接口，适配前端）
        
        请求体格式:
        {
            "domainIds": [1, 2, 3]
        }
        """
        domain_ids = request.data.get('domain_ids')  # 拦截器会自动转换
        if not domain_ids or not isinstance(domain_ids, list):
            return Response(
                {'error': 'domainIds 是必需的，且必须是数组'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 批量删除
        _, deleted_info = Domain.objects.filter(id__in=domain_ids).delete()
        
        # 提取所有删除数量
        deleted_domain_count = deleted_info.get('assets.Domain', 0)
        deleted_subdomain_count = deleted_info.get('assets.Subdomain', 0)
        
        return Response({
            'message': f'成功删除 {deleted_domain_count} 个域名（级联删除 {deleted_subdomain_count} 个子域名）',
            'deletedDomainCount': deleted_domain_count,
            'deletedSubdomainCount': deleted_subdomain_count
        }, status=status.HTTP_200_OK)

class SubdomainViewSet(viewsets.ModelViewSet):
    """
    子域名管理视图集
    """
    queryset = Subdomain.objects.all()
    serializer_class = SubdomainSerializer
    pagination_class = SubdomainPagination