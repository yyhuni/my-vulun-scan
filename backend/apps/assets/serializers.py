"""
资产管理序列化器
"""
from rest_framework import serializers
from .models import Organization, Domain, Subdomain


class OrganizationListSerializer(serializers.ModelSerializer):
    """
    组织列表序列化器（简化版）
    """
    domain_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'domain_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_domain_count(self, obj):
        """获取关联的域名数量"""
        return obj.domains.count()


class OrganizationDetailSerializer(serializers.ModelSerializer):
    """
    组织详情序列化器（包含关联域名）
    """
    domain_count = serializers.SerializerMethodField()
    domain_list = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'domain_count', 'domain_list', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_domain_count(self, obj):
        """获取关联的域名数量"""
        return obj.domains.count()
    
    def get_domain_list(self, obj):
        """获取关联的域名列表"""
        domains = obj.domains.all()
        return [{'id': d.id, 'name': d.name} for d in domains]


class OrganizationCreateUpdateSerializer(serializers.ModelSerializer):
    """
    组织创建/更新序列化器
    """
    domain_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        write_only=True,
        help_text='关联的域名 ID 列表'
    )
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'domain_ids', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """验证组织名称"""
        if not value or not value.strip():
            raise serializers.ValidationError('组织名称不能为空')
        
        # 检查名称是否已存在（排除当前对象）
        queryset = Organization.objects.filter(name=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(f'组织名称 "{value}" 已存在')
        
        return value.strip()
    
    def validate_domain_ids(self, value):
        """验证域名 ID 列表"""
        if not value:
            return []
        
        # 检查域名是否存在
        existing_ids = set(Domain.objects.filter(id__in=value).values_list('id', flat=True))
        invalid_ids = set(value) - existing_ids
        
        if invalid_ids:
            raise serializers.ValidationError(f'域名 ID {invalid_ids} 不存在')
        
        return value
    
    def create(self, validated_data):
        """创建组织"""
        domain_ids = validated_data.pop('domain_ids', [])
        
        # 创建组织
        organization = Organization.objects.create(**validated_data)
        
        # 关联域名
        if domain_ids:
            organization.domains.set(domain_ids)
        
        return organization
    
    def update(self, instance, validated_data):
        """更新组织"""
        domain_ids = validated_data.pop('domain_ids', None)
        
        # 更新基本字段
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 更新关联域名
        if domain_ids is not None:
            instance.domains.set(domain_ids)
        
        return instance
