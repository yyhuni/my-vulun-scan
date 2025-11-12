from rest_framework import serializers
from .models import Subdomain, IPAddress, Port


class PortSerializer(serializers.ModelSerializer):
    """端口序列化器"""
    
    class Meta:
        model = Port
        fields = ['number', 'service_name', 'description', 'is_uncommon']


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
    
    ports = PortSerializer(many=True, read_only=True)
    ip_addresses = serializers.SerializerMethodField()
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'created_at', 'cname', 
            'is_cdn', 'cdn_name', 'ports', 'ip_addresses'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_ip_addresses(self, obj):
        """获取子域名关联的所有 IP 地址"""
        return [ip.ip for ip in obj.ip_addresses.all()]


class IPAddressListSerializer(serializers.ModelSerializer):
    """IP 地址列表序列化器"""

    subdomain = serializers.CharField(source='subdomain.name', allow_blank=True, default='')
    created_at = serializers.DateTimeField(read_only=True)
    ports = PortSerializer(many=True, read_only=True)

    class Meta:
        model = IPAddress
        fields = [
            'id',
            'ip',
            'subdomain',
            'reverse_pointer',
            'created_at',
            'ports',
        ]
        read_only_fields = fields
