"""资产管理序列化器"""
from rest_framework import serializers
from .models import Organization, Domain, Subdomain
from apps.common.normalizer import normalize_domain
from apps.common.validators import validate_domain


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
    name = serializers.CharField(max_length=255, required=True, allow_blank=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)
    
    def validate_name(self, value):
        """
        规范化并验证域名
        1. 跳过空值（由 allow_blank=False 处理）
        2. 规范化域名（去除空格、小写、移除末尾点）
        3. 验证域名格式
        
        Returns:
            规范化后的域名
            
        Raises:
            ValidationError: 域名无效
        """
        try:
            # 规范化域名
            normalized = normalize_domain(value)
            
            # 验证域名格式
            validate_domain(normalized)
            
            return normalized
        except ValueError as e:
            raise serializers.ValidationError(str(e))


class BulkCreateDomainSerializer(serializers.Serializer):
    """批量创建域名请求序列化器"""
    domains = serializers.ListField(
        child=DomainItemSerializer(),
        required=True,
        allow_empty=False,
        help_text="域名列表"
    )
    organization_id = serializers.IntegerField(required=True, min_value=1, help_text="组织ID")