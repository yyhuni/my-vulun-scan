"""
Worker 节点序列化器
"""
from rest_framework import serializers
from apps.engine.models import WorkerNode


class WorkerNodeSerializer(serializers.ModelSerializer):
    """Worker 节点序列化器"""
    
    # 密码只写（不返回给前端）
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    # 动态状态
    status = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkerNode
        fields = ['id', 'name', 'ip_address', 'ssh_port', 'username', 'status', 
                  'last_seen', 'info', 'created_at', 'updated_at', 'password']
        read_only_fields = ['id', 'status', 'last_seen', 'info', 'created_at', 'updated_at']
    
    def get_status(self, obj) -> str:
        """
        动态计算状态：
        1. last_seen 为空 -> pending (等待部署)
        2. last_seen < 60s -> online (运行中)
        3. last_seen > 60s -> offline (离线)
        """
        if not obj.last_seen:
            return 'pending'
            
        from django.utils import timezone
        if (timezone.now() - obj.last_seen).total_seconds() < 60:
            return 'online'
        return 'offline'
    
    def create(self, validated_data):
        """创建时保存密码"""
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """更新时，如果密码为空则不更新密码"""
        password = validated_data.get('password', '')
        if not password:
            validated_data.pop('password', None)
        return super().update(instance, validated_data)
