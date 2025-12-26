"""EHole 指纹 Serializer"""

from rest_framework import serializers

from apps.engine.models import EholeFingerprint


class EholeFingerprintSerializer(serializers.ModelSerializer):
    """EHole 指纹序列化器"""
    
    class Meta:
        model = EholeFingerprint
        fields = ['id', 'cms', 'method', 'location', 'keyword', 
                  'is_important', 'type', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def validate_cms(self, value):
        """校验 cms 字段"""
        if not value or not value.strip():
            raise serializers.ValidationError("cms 字段不能为空")
        return value.strip()
    
    def validate_keyword(self, value):
        """校验 keyword 字段"""
        if not isinstance(value, list):
            raise serializers.ValidationError("keyword 必须是数组")
        return value
