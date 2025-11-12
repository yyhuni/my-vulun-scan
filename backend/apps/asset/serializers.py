from rest_framework import serializers
from .models import Subdomain, IPAddress


class SubdomainSerializer(serializers.ModelSerializer):
    """子域名序列化器"""
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'created_at', 'cname', 
            'is_cdn', 'cdn_name', 'scan', 'target'
        ]
        read_only_fields = ['id', 'created_at']


class SubdomainListSerializer(serializers.ModelSerializer):
    """子域名列表序列化器（用于扫描详情）"""
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'created_at', 'cname', 
            'is_cdn', 'cdn_name'
        ]
        read_only_fields = ['id', 'created_at']


class IPAddressListSerializer(serializers.ModelSerializer):
    """IP 地址列表序列化器"""

    subdomain = serializers.CharField(source='subdomain.name', allow_blank=True, default='')
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = IPAddress
        fields = [
            'id',
            'ip',
            'subdomain',
            'reverse_pointer',
            'created_at',
        ]
        read_only_fields = fields
