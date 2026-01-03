from rest_framework import serializers
from .models import Subdomain, WebSite, Directory, HostPortMapping, Endpoint, Vulnerability
from .models.snapshot_models import (
    SubdomainSnapshot,
    WebsiteSnapshot,
    DirectorySnapshot,
    EndpointSnapshot,
    VulnerabilitySnapshot,
)


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
            'id', 'name', 'created_at', 'target'
        ]
        read_only_fields = ['id', 'created_at']


class SubdomainListSerializer(serializers.ModelSerializer):
    """子域名列表序列化器（用于扫描详情）"""
    
    # 注意：Subdomain 模型已简化，只保留核心字段
    # cname, is_cdn, cdn_name 等字段已移至 SubdomainSnapshot
    # ports 和 ip_addresses 关系已被重构为 HostPortMapping
    
    class Meta:
        model = Subdomain
        fields = [
            'id', 'name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


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
    """站点序列化器（目标详情页）"""
    
    subdomain = serializers.CharField(source='subdomain.name', allow_blank=True, default='')
    responseHeaders = serializers.CharField(source='response_headers', read_only=True)  # 原始HTTP响应头
    
    class Meta:
        model = WebSite
        fields = [
            'id',
            'url',
            'host',
            'location', 
            'title',
            'webserver',
            'content_type',
            'status_code',
            'content_length',
            'response_body',
            'tech',
            'vhost',
            'responseHeaders',  # HTTP响应头
            'subdomain',
            'created_at',
        ]
        read_only_fields = fields


class VulnerabilitySerializer(serializers.ModelSerializer):
    """漏洞资产序列化器（按目标查看漏洞资产）。"""

    class Meta:
        model = Vulnerability
        fields = [
            'id',
            'target',
            'url',
            'vuln_type',
            'severity',
            'source',
            'cvss_score',
            'description',
            'raw_output',
            'created_at',
        ]
        read_only_fields = fields


class VulnerabilitySnapshotSerializer(serializers.ModelSerializer):
    """漏洞快照序列化器（用于扫描历史漏洞列表）。"""

    class Meta:
        model = VulnerabilitySnapshot
        fields = [
            'id',
            'url',
            'vuln_type',
            'severity',
            'source',
            'cvss_score',
            'description',
            'raw_output',
            'created_at',
        ]
        read_only_fields = fields


class EndpointListSerializer(serializers.ModelSerializer):
    """端点列表序列化器（用于目标端点列表页）"""

    # GF 匹配模式（gf-patterns 工具匹配的敏感 URL 模式）
    gfPatterns = serializers.ListField(
        child=serializers.CharField(),
        source='matched_gf_patterns',
        read_only=True,
    )
    responseHeaders = serializers.CharField(source='response_headers', read_only=True)  # 原始HTTP响应头

    class Meta:
        model = Endpoint
        fields = [
            'id',
            'url',
            'location',
            'status_code',
            'title',
            'content_length',
            'content_type',
            'webserver',
            'response_body',
            'tech',
            'vhost',
            'responseHeaders',  # HTTP响应头
            'gfPatterns',
            'created_at',
        ]
        read_only_fields = fields


class DirectorySerializer(serializers.ModelSerializer):
    """目录序列化器"""
    
    created_at = serializers.DateTimeField(read_only=True)
    
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
            'created_at',
        ]
        read_only_fields = fields


class IPAddressAggregatedSerializer(serializers.Serializer):
    """
    IP 地址聚合序列化器
    
    基于 HostPortMapping 模型，按 IP 聚合显示：
    - ip: IP 地址
    - hosts: 该 IP 关联的所有主机名列表
    - ports: 该 IP 关联的所有端口列表
    - created_at: 创建时间
    """
    ip = serializers.IPAddressField(read_only=True)
    hosts = serializers.ListField(child=serializers.CharField(), read_only=True)
    ports = serializers.ListField(child=serializers.IntegerField(), read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


# ==================== 快照序列化器 ====================

class SubdomainSnapshotSerializer(serializers.ModelSerializer):
    """子域名快照序列化器（用于扫描历史）"""
    
    class Meta:
        model = SubdomainSnapshot
        fields = ['id', 'name', 'created_at']
        read_only_fields = fields


class WebsiteSnapshotSerializer(serializers.ModelSerializer):
    """网站快照序列化器（用于扫描历史）"""
    
    subdomain_name = serializers.CharField(source='subdomain.name', read_only=True)
    responseHeaders = serializers.CharField(source='response_headers', read_only=True)  # 原始HTTP响应头
    
    class Meta:
        model = WebsiteSnapshot
        fields = [
            'id',
            'url',
            'location',
            'title',
            'webserver',
            'content_type',
            'status_code',
            'content_length',
            'response_body',
            'tech',
            'vhost',
            'responseHeaders',  # HTTP响应头
            'subdomain_name',
            'created_at',
        ]
        read_only_fields = fields


class DirectorySnapshotSerializer(serializers.ModelSerializer):
    """目录快照序列化器（用于扫描历史）"""
    
    class Meta:
        model = DirectorySnapshot
        fields = [
            'id',
            'url',
            'status',
            'content_length',
            'words',
            'lines',
            'content_type',
            'duration',
            'created_at',
        ]
        read_only_fields = fields


class EndpointSnapshotSerializer(serializers.ModelSerializer):
    """端点快照序列化器（用于扫描历史）"""

    # GF 匹配模式（gf-patterns 工具匹配的敏感 URL 模式）
    gfPatterns = serializers.ListField(
        child=serializers.CharField(),
        source='matched_gf_patterns',
        read_only=True,
    )
    responseHeaders = serializers.CharField(source='response_headers', read_only=True)  # 原始HTTP响应头

    class Meta:
        model = EndpointSnapshot
        fields = [
            'id',
            'url',
            'host',
            'location',
            'title',
            'webserver',
            'content_type',
            'status_code',
            'content_length',
            'response_body',
            'tech',
            'vhost',
            'responseHeaders',  # HTTP响应头
            'gfPatterns',
            'created_at',
        ]
        read_only_fields = fields
