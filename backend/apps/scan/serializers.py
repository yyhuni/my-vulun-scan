from rest_framework import serializers
from .models import Scan


class ScanSerializer(serializers.ModelSerializer):
    """扫描任务序列化器"""
    target_name = serializers.SerializerMethodField()
    engine_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Scan
        fields = [
            'id', 'target', 'target_name', 'engine', 'engine_name',
            'started_at', 'stopped_at', 'status', 'results_dir',
            'task_ids', 'task_names', 'error_message'
        ]
        read_only_fields = [
            'id', 'started_at', 'stopped_at', 'results_dir',
            'task_ids', 'task_names', 'error_message', 'status'
        ]
    
    def get_target_name(self, obj):
        """获取目标名称"""
        return obj.target.name if obj.target else None
    
    def get_engine_name(self, obj):
        """获取引擎名称"""
        return obj.engine.name if obj.engine else None   
