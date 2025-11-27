from rest_framework import serializers
from .models import Scan, ScheduledScan


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


class QuickScanSerializer(serializers.Serializer):
    """
    快速扫描序列化器
    
    功能：
    - 接收目标列表和引擎配置
    - 自动创建/获取目标
    - 立即发起扫描
    """
    
    # 批量创建的最大数量限制
    MAX_BATCH_SIZE = 1000
    
    # 目标列表
    targets = serializers.ListField(
        child=serializers.DictField(),
        help_text='目标列表，每个目标包含 name 字段'
    )
    
    # 扫描引擎 ID
    engine_id = serializers.IntegerField(
        required=True,
        help_text='使用的扫描引擎 ID (必填)'
    )
    
    def validate_targets(self, value):
        """验证目标列表"""
        if not value:
            raise serializers.ValidationError("目标列表不能为空")
        
        # 检查数量限制，防止服务器过载
        if len(value) > self.MAX_BATCH_SIZE:
            raise serializers.ValidationError(
                f"快速扫描最多支持 {self.MAX_BATCH_SIZE} 个目标，当前提交了 {len(value)} 个"
            )
        
        # 验证每个目标的必填字段
        for idx, target in enumerate(value):
            if 'name' not in target:
                raise serializers.ValidationError(f"第 {idx + 1} 个目标缺少 name 字段")
            if not target['name']:
                raise serializers.ValidationError(f"第 {idx + 1} 个目标的 name 不能为空")
        
        return value


# ==================== 定时扫描序列化器 ====================

class ScheduledScanSerializer(serializers.ModelSerializer):
    """定时扫描任务序列化器（用于列表和详情）"""
    
    # 关联字段
    engine_name = serializers.CharField(source='engine.name', read_only=True)
    target_ids = serializers.SerializerMethodField()
    target_domains = serializers.SerializerMethodField()
    
    class Meta:
        model = ScheduledScan
        fields = [
            'id', 'name',
            'engine', 'engine_name',
            'target_ids', 'target_domains',
            'cron_expression',
            'is_enabled', 'deployment_id',
            'run_count', 'last_run_time', 'next_run_time',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'deployment_id', 'run_count',
            'last_run_time', 'next_run_time',
            'created_at', 'updated_at'
        ]
    
    def get_target_ids(self, obj):
        """获取目标 ID 列表"""
        return list(obj.targets.values_list('id', flat=True))
    
    def get_target_domains(self, obj):
        """获取目标域名列表"""
        return list(obj.targets.values_list('name', flat=True))


class CreateScheduledScanSerializer(serializers.Serializer):
    """创建定时扫描任务序列化器"""
    
    name = serializers.CharField(max_length=200, help_text='任务名称')
    engine_id = serializers.IntegerField(help_text='扫描引擎 ID')
    target_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='目标 ID 列表'
    )
    cron_expression = serializers.CharField(
        max_length=100,
        default='0 2 * * *',
        help_text='Cron 表达式，格式：分 时 日 月 周'
    )
    is_enabled = serializers.BooleanField(default=True, help_text='是否立即启用')


class UpdateScheduledScanSerializer(serializers.Serializer):
    """更新定时扫描任务序列化器"""
    
    name = serializers.CharField(max_length=200, required=False, help_text='任务名称')
    engine_id = serializers.IntegerField(required=False, help_text='扫描引擎 ID')
    target_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='目标 ID 列表'
    )
    cron_expression = serializers.CharField(max_length=100, required=False, help_text='Cron 表达式')
    is_enabled = serializers.BooleanField(required=False, help_text='是否启用')


class ToggleScheduledScanSerializer(serializers.Serializer):
    """切换定时扫描启用状态序列化器"""
    
    is_enabled = serializers.BooleanField(help_text='是否启用')
