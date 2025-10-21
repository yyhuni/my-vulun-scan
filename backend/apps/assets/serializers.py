"""资产管理序列化器"""
from rest_framework import serializers
from .models import Organization, Domain, Subdomain


class OrganizationSerializer(serializers.ModelSerializer):
    """组织信息序列化器"""
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
    
class DomainSerializer(serializers.ModelSerializer):
    """域名信息序列化器"""
    
    class Meta:
        model = Domain
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class SubdomainSerializer(serializers.ModelSerializer):
    """子域名信息序列化器"""
    
    class Meta:
        model = Subdomain
        fields = ['id', 'name', 'domain', 'is_root', 'created_at', 'updated_at']


class DomainItemSerializer(serializers.Serializer):
    """单个域名项序列化器"""
    name = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)


class BulkCreateDomainSerializer(serializers.Serializer):
    """批量创建域名请求序列化器"""
    domains = serializers.ListField(
        child=DomainItemSerializer(),
        required=True,
        allow_empty=False,
        help_text="域名列表"
    )
    organization_id = serializers.IntegerField(required=True, min_value=1, help_text="组织ID")