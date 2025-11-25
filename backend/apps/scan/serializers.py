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
            'created_at', 'stopped_at', 'status', 'results_dir',
            'flow_run_ids', 'flow_run_names', 'error_message'
        ]
        read_only_fields = [
            'id', 'created_at', 'stopped_at', 'results_dir',
            'flow_run_ids', 'flow_run_names', 'error_message', 'status'
        ]
    
    def get_target_name(self, obj):
        """获取目标名称"""
        return obj.target.name if obj.target else None
    
    def get_engine_name(self, obj):
        """获取引擎名称"""
        return obj.engine.name if obj.engine else None


class ScanHistorySerializer(serializers.ModelSerializer):
    """扫描历史列表专用序列化器
    
    为前端扫描历史页面提供优化的数据格式，包括：
    - 扫描汇总统计（子域名、端点、漏洞数量）
    - 进度百分比和当前阶段
    """
    
    # 字段映射
    target_name = serializers.CharField(source='target.name', read_only=True)
    engine_name = serializers.CharField(source='engine.name', read_only=True)
    
    # 计算字段
    summary = serializers.SerializerMethodField()
    
    # 进度跟踪字段（直接从模型读取）
    progress = serializers.IntegerField(read_only=True)
    current_stage = serializers.CharField(read_only=True)
    stage_progress = serializers.JSONField(read_only=True)
    
    class Meta:
        model = Scan
        fields = [
            'id', 'target', 'target_name', 'engine', 'engine_name', 
            'created_at', 'status', 'summary', 'progress',
            'current_stage', 'stage_progress'
        ]
    
    def get_summary(self, obj):
        """获取扫描汇总数据（使用缓存字段）
        
        性能优化：只使用缓存字段，不实时计算
        - 缓存字段由扫描完成时自动更新（通过 ScanService.update_cached_stats）
        - 扫描进行中或未更新时显示 0
        
        返回字段：
        - subdomains: 子域名数量
        - websites: 网站数量
        - endpoints: 端点数量（暂无快照表，返回0）
        - ips: IP地址数量
        - directories: 目录数量
        - vulnerabilities: 漏洞统计（暂时返回 0，待后续实现）
        """
        # 只使用缓存字段（无数据库查询）
        return {
            'subdomains': obj.cached_subdomains_count or 0,
            'websites': obj.cached_websites_count or 0,
            'endpoints': obj.cached_endpoints_count or 0,
            'ips': obj.cached_ips_count or 0,
            'directories': obj.cached_directories_count or 0,
            'vulnerabilities': {
                'total': 0,
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0
            }
        }
    
