from rest_framework import serializers
from .models import Subdomain, WebSite, Directory


# 注意：IPAddress 和 Port 模型已被重构为 HostPortMapping
# 以下序列化器暂时注释，需要根据新架构重新实现

# class PortSerializer(serializers.ModelSerializer):
#     """端口序列化器"""
#     
#     class Meta:
#         model = Port
#         fields = ['number', 'service_name', 'description', 'is_uncommon']


class SubdomainSerializer(serializers.ModelSerializer):
    """子域名序列化器"""
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'discovered_at', 'cname', 
            'is_cdn', 'cdn_name', 'target'
        ]
        read_only_fields = ['id', 'discovered_at']


class SubdomainListSerializer(serializers.ModelSerializer):
    """子域名列表序列化器（用于扫描详情）"""
    
    # 注意：ports 和 ip_addresses 字段需要根据新的 HostPortMapping 架构重新实现
    # ports = PortSerializer(many=True, read_only=True)
    # ip_addresses = serializers.SerializerMethodField()
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'discovered_at', 'cname', 
            'is_cdn', 'cdn_name'
        ]
        read_only_fields = ['id', 'discovered_at']
    
    # def get_ip_addresses(self, obj):
    #     """获取子域名关联的所有 IP 地址"""
    #     return [ip.ip for ip in obj.ip_addresses.all()]


# class IPAddressListSerializer(serializers.ModelSerializer):
#     """IP 地址列表序列化器"""
#
#     subdomain = serializers.CharField(source='subdomain.name', allow_blank=True, default='')
#     created_at = serializers.DateTimeField(read_only=True)
#     ports = PortSerializer(many=True, read_only=True)
#
#     class Meta:
#         model = IPAddress
#         fields = [
#             'id',
#             'ip',
#             'subdomain',
#             'reverse_pointer',
#             'created_at',
#             'ports',
#         ]
#         read_only_fields = fields


class WebSiteSerializer(serializers.ModelSerializer):
    """站点序列化器"""
    
    subdomain = serializers.CharField(source='subdomain.name', allow_blank=True, default='')
    created_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = WebSite
        fields = [
            'id',
            'url',
            'location', 
            'title',
            'webserver',
            'content_type',
            'status_code',
            'content_length',
            'body_preview',
            'tech',
            'vhost',
            'subdomain',
            'created_at',
        ]
        read_only_fields = fields


class DirectorySerializer(serializers.ModelSerializer):
    """目录序列化器"""
    
    website_url = serializers.CharField(source='website.url', read_only=True)
    discovered_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = Directory
        fields = [
            'id',
            'url',
            'status',
            'content_length',
            'words',
            'lines',
            'content_type',
            'duration',
            'website_url',
            'discovered_at',
        ]
        read_only_fields = fields
