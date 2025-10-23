"""资产管理序列化器"""
import ipaddress
from rest_framework import serializers
from .models import Organization, Asset, Domain
from apps.common.normalizer import normalize_domain
from apps.common.validators import validate_domain


class OrganizationSerializer(serializers.ModelSerializer):
    """组织信息序列化器（基础版，不包含 assets）"""
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class AssetSimpleSerializer(serializers.ModelSerializer):
    """资产简化序列化器（ID、名称和类型，用于嵌套展示）"""
    
    class Meta:
        model = Asset
        fields = ['id', 'name', 'type']

class OrganizationDetailSerializer(serializers.ModelSerializer):
    """组织详情序列化器（包含 assets，用于详情和列表展示）"""
    assets = AssetSimpleSerializer(many=True, read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'created_at', 'updated_at', 'assets']

class OrganizationSimpleSerializer(serializers.ModelSerializer):
    """组织简化序列化器（仅 ID 和名称，用于嵌套展示）"""
    
    class Meta:
        model = Organization
        fields = ['id', 'name']
    
class AssetSerializer(serializers.ModelSerializer):
    """资产信息序列化器（基础版，不包含 organizations）"""
    
    class Meta:
        model = Asset
        fields = ['id', 'name', 'description', 'type', 'created_at', 'updated_at']

class AssetListSerializer(serializers.ModelSerializer):
    """资产列表序列化器（包含 organizations，用于列表展示）"""
    organizations = OrganizationSimpleSerializer(many=True, read_only=True)
    
    class Meta:
        model = Asset
        fields = ['id', 'name', 'description', 'type', 'created_at', 'updated_at', 'organizations']

class DomainSerializer(serializers.ModelSerializer):
    """域名信息序列化器"""
    
    class Meta:
        model = Domain
        fields = ['id', 'name', 'asset', 'created_at', 'updated_at']


class CreateAssetItemSerializer(serializers.Serializer):
    """单个资产项序列化器"""
    name = serializers.CharField(max_length=255, required=True, allow_blank=False)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)
    
    def _validate_as_ip(self, name):
        """
        验证为 IP 地址
        Returns: (is_valid, normalized_name, error_msg)
        """
        try:
            ipaddress.ip_address(name)
            return True, name, None
        except ValueError as e:
            return False, name, str(e)
    
    def _validate_as_domain(self, name):
        """
        验证为域名
        Returns: (is_valid, normalized_name, error_msg)
        """
        try:
            # 规范化域名（去除空格、小写、移除末尾点）
            normalized = normalize_domain(name)
            # 验证域名格式
            validate_domain(normalized)
            return True, normalized, None
        except ValueError as e:
            return False, name, str(e)
    
    def _validate_as_cidr(self, name):
        """
        验证为 CIDR 网段（如 192.168.1.0/24）
        Returns: (is_valid, normalized_name, error_msg)
        """
        try:
            # 使用 ipaddress 验证 CIDR 格式
            network = ipaddress.ip_network(name, strict=False)
            # strict=False 允许主机位不为0，如 192.168.1.1/24 也能通过
            # 返回标准化的 CIDR 表示
            return True, str(network), None
        except ValueError as e:
            return False, name, str(e)
    
    def validate(self, data):
        """
        自动识别资产类型并进行相应验证
        使用验证器链模式，易于扩展新类型
        """
        name = data.get('name')
        
        # 验证器链：按优先级顺序尝试（IP > CIDR > 域名 > 其他）
        # 格式：(type_name, validator_func)
        # 注意：IP 必须在 CIDR 之前，因为单个 IP 也可能被识别为 /32 或 /128 的 CIDR
        validators = [
            ('ip', self._validate_as_ip),
            ('cidr', self._validate_as_cidr),
            ('domain', self._validate_as_domain),
            # ('url', self._validate_as_url),    # 未来可扩展
        ]
        
        # 依次尝试每个验证器
        all_errors = []
        for asset_type, validator in validators:
            is_valid, normalized_name, error_msg = validator(name)
            if is_valid:
                # 找到匹配的类型
                data['type'] = asset_type
                data['name'] = normalized_name
                return data
            else:
                all_errors.append(f"{asset_type}: {error_msg}")
        
        # 所有验证器都失败
        raise serializers.ValidationError({
            'name': f'无效的资产：{name} 无法识别为任何支持的类型。尝试的类型：{", ".join(all_errors)}'
        })
        


class BulkCreateAssetSerializer(serializers.Serializer):
    """批量创建资产请求序列化器"""
    assets = serializers.ListField(
        child=CreateAssetItemSerializer(),
        required=True,
        allow_empty=False,
        help_text="资产列表"
    )
    organization_id = serializers.IntegerField(required=True, min_value=1, help_text="组织ID")