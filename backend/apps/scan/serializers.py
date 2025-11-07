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


class ScanHistorySerializer(serializers.ModelSerializer):
    """扫描历史列表专用序列化器
    
    为前端扫描历史页面提供优化的数据格式，包括：
    - 扫描汇总统计（子域名、端点、漏洞数量）
    - 动态计算的进度百分比
    """
    
    # 字段映射
    target_name = serializers.CharField(source='target.name', read_only=True)
    engine_name = serializers.CharField(source='engine.name', read_only=True)
    
    # 计算字段
    summary = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    
    class Meta:
        model = Scan
        fields = [
            'id', 'target_name', 'engine_name', 'started_at',
            'status', 'summary', 'progress'
        ]
    
    def get_summary(self, obj):
        """计算扫描汇总数据
        
        统计该扫描发现的资产数量：
        - subdomains: 子域名数量
        - endpoints: 端点数量
        - vulnerabilities: 漏洞统计（暂时返回 0，待后续实现）
        """
        return {
            'subdomains': obj.subdomains.count(),
            'endpoints': obj.endpoints.count(),
            'vulnerabilities': {
                'total': 0,
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0
            }
        }
    
    def get_progress(self, obj):
        """根据 task_names 计算实际进度百分比
        
        进度计算逻辑：
        - successful: 100% (已成功完成)
        - initiated: 0% (刚初始化)
        - running: 根据已完成的任务数动态计算
          * 0 个任务: 10% (刚开始)
          * 1 个任务: 33% (完成初始化)
          * 2 个任务: 66% (完成子域名发现)
          * 3+ 个任务: 90% (接近完成)
        - failed/aborted: 根据失败前完成的任务数计算
        
        假设标准扫描有 3 个任务阶段：
        1. initiate_scan (初始化)
        2. subdomain_discovery (子域名发现)
        3. finalize_scan (完成扫描)
        """
        if obj.status == 'successful':
            return 100
        
        if obj.status == 'initiated':
            return 0
        
        # 获取已完成的任务数
        completed_tasks = len(obj.task_names) if obj.task_names else 0
        expected_tasks = 3  # 标准扫描的任务数
        
        if obj.status in ['failed', 'aborted']:
            # 失败或中止：根据已完成的任务数计算进度
            if completed_tasks == 0:
                return 0
            return min(int((completed_tasks / expected_tasks) * 100), 100)
        
        if obj.status == 'running':
            # 运行中：根据已记录的任务数估算进度
            if completed_tasks == 0:
                return 10  # 刚开始
            elif completed_tasks == 1:
                return 33  # 完成初始化
            elif completed_tasks == 2:
                return 66  # 完成子域名发现
            else:
                return 90  # 接近完成
        
        return 0
