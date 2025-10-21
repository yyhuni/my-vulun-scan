"""资产管理序列化器"""
from rest_framework import serializers
from .models import Organization


class OrganizationSerializer(serializers.ModelSerializer):
    """组织信息序列化器"""
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
    
