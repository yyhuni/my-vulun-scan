from rest_framework import serializers
from .models import ScanEngine


class ScanEngineSerializer(serializers.ModelSerializer):
    """扫描引擎序列化器"""
    
    class Meta:
        model = ScanEngine
        fields = [
            'id',
            'name',
            'configuration',
            'is_default',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_name(self, value):
        """验证引擎名称"""
        if not value.strip():
            raise serializers.ValidationError("引擎名称不能为空")
        return value.strip()
    
    def validate_configuration(self, value):
        """验证 YAML 配置"""
        if value:
            # 可以在这里添加 YAML 格式验证
            import yaml
            try:
                yaml.safe_load(value)
            except yaml.YAMLError as e:
                raise serializers.ValidationError(f"YAML 格式错误: {str(e)}")
        return value

