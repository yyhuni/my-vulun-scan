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

class SubdomainViewSet(viewsets.ModelViewSet):
    """
    子域名管理视图集
    """
    queryset = Subdomain.objects.all()
    serializer_class = SubdomainSerializer
    pagination_class = SubdomainPagination