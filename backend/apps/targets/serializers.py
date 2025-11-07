from rest_framework import serializers
from .models import Organization, Target
from apps.common.normalizer import normalize_target
from apps.common.validators import detect_target_type


class SimpleOrganizationSerializer(serializers.ModelSerializer):
    """
    简化版组织序列化器 - 用于嵌套在其他序列化器中
    
    注意事项:
    1. 只包含基本字段 (id, name)，不嵌套 targets
    2. 避免循环引用：Organization ↔ Target 是多对多关系
       如果双向嵌套会导致无限递归
    3. 适用场景：
       - 在 TargetSerializer 中显示所属组织列表
       - 在其他需要显示组织基本信息的地方
    """
    class Meta:
        model = Organization
        fields = ['id', 'name']


class TargetSerializer(serializers.ModelSerializer):
    """
    目标序列化器
    
    性能优化说明:
    1. 使用嵌套序列化器 SimpleOrganizationSerializer 显示关联的组织
    2. ⚠️ 重要：ViewSet 必须使用 prefetch_related('organizations')
       否则会产生 N+1 查询问题：
       - 没有预加载：100 个目标 = 1 + 100 = 101 次查询
       - 正确预加载：100 个目标 = 1 + 1 = 2 次查询
    
    已优化的视图:
    - TargetViewSet: queryset = Target.objects.prefetch_related('organizations')
    - OrganizationViewSet.targets(): queryset.prefetch_related('organizations')
    """
    organizations = SimpleOrganizationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Target
        fields = ['id', 'name', 'type', 'created_at', 'last_scanned_at', 'organizations']
        read_only_fields = ['id', 'created_at', 'type']
    
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
    # 使用 IntegerField 接收由 annotate 预计算的 target_count
    # 避免 N+1 查询问题（在 ViewSet 的 get_queryset 中使用 annotate 预计算）
    target_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Organization
        fields = ['id', 'name', 'description', 'created_at', 'target_count']
        read_only_fields = ['id', 'created_at', 'target_count']


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
    
