from rest_framework import serializers
from .models import Subdomain


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

