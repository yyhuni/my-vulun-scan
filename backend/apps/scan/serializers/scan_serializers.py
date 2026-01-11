"""扫描任务序列化器"""

from rest_framework import serializers

from ..models import Scan
from .mixins import ScanConfigValidationMixin


class ScanSerializer(serializers.ModelSerializer):
    """扫描任务序列化器"""
    target_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Scan
        fields = [
            'id', 'target', 'target_name', 'engine_ids', 'engine_names',
            'created_at', 'stopped_at', 'status', 'results_dir',
            'container_ids', 'error_message', 'scan_mode'
        ]
        read_only_fields = [
            'id', 'created_at', 'stopped_at', 'results_dir',
            'container_ids', 'error_message', 'status', 'scan_mode'
        ]
    
    def get_target_name(self, obj):
        return obj.target.name if obj.target else None


class ScanHistorySerializer(serializers.ModelSerializer):
    """扫描历史列表序列化器"""
    
    target_name = serializers.CharField(source='target.name', read_only=True)
    worker_name = serializers.CharField(source='worker.name', read_only=True, allow_null=True)
    summary = serializers.SerializerMethodField()
    progress = serializers.IntegerField(read_only=True)
    current_stage = serializers.CharField(read_only=True)
    stage_progress = serializers.JSONField(read_only=True)
    
    class Meta:
        model = Scan
        fields = [
            'id', 'target', 'target_name', 'engine_ids', 'engine_names',
            'worker_name', 'created_at', 'status', 'error_message', 'summary',
            'progress', 'current_stage', 'stage_progress', 'yaml_configuration',
            'scan_mode'
        ]
    
    def get_summary(self, obj):
        summary = {
            'subdomains': obj.cached_subdomains_count or 0,
            'websites': obj.cached_websites_count or 0,
            'endpoints': obj.cached_endpoints_count or 0,
            'ips': obj.cached_ips_count or 0,
            'directories': obj.cached_directories_count or 0,
            'screenshots': obj.cached_screenshots_count or 0,
        }
        summary['vulnerabilities'] = {
            'total': obj.cached_vulns_total or 0,
            'critical': obj.cached_vulns_critical or 0,
            'high': obj.cached_vulns_high or 0,
            'medium': obj.cached_vulns_medium or 0,
            'low': obj.cached_vulns_low or 0,
        }
        return summary


class QuickScanSerializer(ScanConfigValidationMixin, serializers.Serializer):
    """快速扫描序列化器"""
    
    MAX_BATCH_SIZE = 5000
    
    targets = serializers.ListField(
        child=serializers.DictField(),
        help_text='目标列表，每个目标包含 name 字段'
    )
    configuration = serializers.CharField(required=True, help_text='YAML 格式的扫描配置')
    engine_ids = serializers.ListField(child=serializers.IntegerField(), required=True)
    engine_names = serializers.ListField(child=serializers.CharField(), required=True)
    
    def validate_targets(self, value):
        if not value:
            raise serializers.ValidationError("目标列表不能为空")
        if len(value) > self.MAX_BATCH_SIZE:
            raise serializers.ValidationError(
                f"快速扫描最多支持 {self.MAX_BATCH_SIZE} 个目标，当前提交了 {len(value)} 个"
            )
        for idx, target in enumerate(value):
            if 'name' not in target:
                raise serializers.ValidationError(f"第 {idx + 1} 个目标缺少 name 字段")
            if not target['name']:
                raise serializers.ValidationError(f"第 {idx + 1} 个目标的 name 不能为空")
        return value


class InitiateScanSerializer(ScanConfigValidationMixin, serializers.Serializer):
    """发起扫描任务序列化器"""
    
    configuration = serializers.CharField(required=True, help_text='YAML 格式的扫描配置')
    engine_ids = serializers.ListField(child=serializers.IntegerField(), required=True)
    engine_names = serializers.ListField(child=serializers.CharField(), required=True)
    organization_id = serializers.IntegerField(required=False, allow_null=True)
    target_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, data):
        organization_id = data.get('organization_id')
        target_id = data.get('target_id')
        
        if not organization_id and not target_id:
            raise serializers.ValidationError('必须提供 organization_id 或 target_id 其中之一')
        if organization_id and target_id:
            raise serializers.ValidationError('organization_id 和 target_id 只能提供其中之一')
        
        return data
