from rest_framework import serializers
from .models import Subdomain, WebSite, Directory, HostPortMapping
from .models.snapshot_models import SubdomainSnapshot, WebsiteSnapshot, DirectorySnapshot


# 注意：IPAddress 和 Port 模型已被重构为 HostPortMapping
# 以下是基于新架构的序列化器实现

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
            'id', 'name', 'discovered_at', 'target'
        ]
        read_only_fields = ['id', 'discovered_at']


class SubdomainListSerializer(serializers.ModelSerializer):
    """子域名列表序列化器（用于扫描详情）"""
    
    # 注意：Subdomain 模型已简化，只保留核心字段
    # cname, is_cdn, cdn_name 等字段已移至 SubdomainSnapshot
    # ports 和 ip_addresses 关系已被重构为 HostPortMapping
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'discovered_at'
        ]
        read_only_fields = ['id', 'discovered_at']


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
            'discovered_at',
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


class IPAddressAggregatedSerializer(serializers.Serializer):
    """
    IP 地址聚合序列化器
    
    基于 HostPortMapping 模型，按 IP 聚合显示：
    - ip: IP 地址
    - hosts: 该 IP 关联的所有主机名列表
    - ports: 该 IP 关联的所有端口列表
    - discovered_at: 首次发现时间
    """
    ip = serializers.IPAddressField(read_only=True)
    hosts = serializers.ListField(child=serializers.CharField(), read_only=True)
    ports = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    discovered_at = serializers.DateTimeField(read_only=True)


# ==================== 快照序列化器 ====================

class SubdomainSnapshotSerializer(serializers.ModelSerializer):
    """子域名快照序列化器（用于扫描历史）"""
    
    class Meta:
        model = SubdomainSnapshot
        fields = ['id', 'name', 'discovered_at']
        read_only_fields = fields


class WebsiteSnapshotSerializer(serializers.ModelSerializer):
    """网站快照序列化器（用于扫描历史）"""
    
    subdomain_name = serializers.CharField(source='subdomain.name', read_only=True)
    webserver = serializers.CharField(source='web_server', read_only=True)  # 映射字段名
    status_code = serializers.IntegerField(source='status', read_only=True)  # 映射字段名
    
    class Meta:
        model = WebsiteSnapshot
        fields = [
            'id',
            'url',
            'location',
            'title',
            'webserver',  # 使用映射后的字段名
            'content_type',
            'status_code',  # 使用映射后的字段名
            'content_length',
            'body_preview',
            'tech',
            'vhost',
            'subdomain_name',
            'discovered_at',
        ]
        read_only_fields = fields


class DirectorySnapshotSerializer(serializers.ModelSerializer):
    """目录快照序列化器（用于扫描历史）"""
    
    website_url = serializers.CharField(source='website.url', read_only=True)
    
    class Meta:
        model = DirectorySnapshot
        fields = [
            'id',
            'url',
            'status',
            'content_length',
            'location',
            'website_url',
            'discovered_at',
        ]
        read_only_fields = fields
