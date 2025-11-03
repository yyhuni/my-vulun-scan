from rest_framework import serializers
from .models import Organization, Target
from apps.common.normalizer import normalize_target
from apps.common.validators import detect_target_type


class TargetSerializer(serializers.ModelSerializer):
    organizations = serializers.SerializerMethodField()
    
    class Meta:
        model = Target
        fields = ['id', 'name', 'type', 'created_at', 'last_scanned_at', 'organizations']
        read_only_fields = ['id', 'created_at', 'type', 'organizations']
    
    def get_organizations(self, obj):
        """获取目标关联的组织列表"""
        return [
            {'id': org.id, 'name': org.name}
            for org in obj.organizations.all()
        ]
    
    def create(self, validated_data):
        """创建目标时自动规范化、检测目标类型"""
        name = validated_data.get('name', '')
        try:
            # 1. 规范化
            normalized_name = normalize_target(name)
            # 2. 验证并检测类型
            target_type = detect_target_type(normalized_name)
            # 3. 写入
            validated_data['name'] = normalized_name
            validated_data['type'] = target_type
        except ValueError as e:
            raise serializers.ValidationError({'name': str(e)})
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """更新目标时，如果 name 变化则重新规范化和检测类型"""
        # 如果 name 发生变化，重新规范化和检测类型
        if 'name' in validated_data and validated_data['name'] != instance.name:
            try:
                # 1. 规范化
                normalized_name = normalize_target(validated_data['name'])
                # 2. 验证并检测类型
                target_type = detect_target_type(normalized_name)
                # 3. 写入
                validated_data['name'] = normalized_name
                validated_data['type'] = target_type
            except ValueError as e:
                raise serializers.ValidationError({'name': str(e)})
        return super().update(instance, validated_data)


class OrganizationSerializer(serializers.ModelSerializer):
    target_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'created_at', 'target_count']
        read_only_fields = ['id', 'created_at', 'target_count']
    
    def get_target_count(self, obj):
        """获取目标数量"""
        return obj.targets.count()


class BatchCreateTargetSerializer(serializers.Serializer):
    """批量创建目标的序列化器"""
    
    # 目标列表
    targets = serializers.ListField(
        child=serializers.DictField(),
        help_text='目标列表，每个目标包含 name 字段（type 会自动检测）'
    )
    
    # 可选：关联的组织ID
    organization_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text='可选：关联到指定组织的ID'
    )
    
    def validate_targets(self, value):
        """验证目标列表"""
        if not value:
            raise serializers.ValidationError("目标列表不能为空")
        
        # 验证每个目标的必填字段
        for idx, target in enumerate(value):
            if 'name' not in target:
                raise serializers.ValidationError(f"第 {idx + 1} 个目标缺少 name 字段")
            if not target['name']:
                raise serializers.ValidationError(f"第 {idx + 1} 个目标的 name 不能为空")
        
        return value
    
