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
            'id', 'target', 'target_name', 'engine', 'engine_name', 
            'created_at', 'status', 'summary', 'progress'
        ]
    
    def get_summary(self, obj):
        """计算扫描汇总数据
        
        统计该扫描发现的资产数量（使用快照数据）：
        - subdomains: 子域名数量
        - websites: 网站数量
        - endpoints: 端点数量（暂无快照表，返回0）
        - ips: IP地址数量（基于 HostPortMappingSnapshot 按 IP 去重）
        - directories: 目录数量
        - vulnerabilities: 漏洞统计（暂时返回 0，待后续实现）
        """
        # 直接统计快照数据
        subdomains_count = obj.subdomain_snapshots.count()
        websites_count = obj.website_snapshots.count()
        directories_count = obj.directory_snapshots.count()
        
        # IP 数量：基于 HostPortMappingSnapshot 按 IP 去重统计
        ips_count = obj.host_port_mapping_snapshots.values('ip').distinct().count()
        
        return {
            'subdomains': subdomains_count,
            'websites': websites_count,
            'endpoints': 0,  # 暂无端点快照表
            'ips': ips_count,
            'directories': directories_count,
            'vulnerabilities': {
                'total': 0,
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0
            }
        }
    
    def get_progress(self, obj):
        """根据扫描状态和执行时间动态计算进度百分比
        
        进度计算策略（基于 Prefect Flow 状态）：
        
        1. **已完成状态**：
           - successful: 100% (扫描成功完成)
           - failed/aborted: 根据执行时长估算进度
        
        2. **初始化状态**：
           - initiated: 0% (刚创建，未开始执行)
        
        3. **运行中状态**：
           - running: 根据已执行时长动态估算
             * 0-30秒: 10-30% (创建工作空间 + 启动扫描工具)
             * 30秒-2分钟: 30-70% (扫描工具执行中)
             * 2分钟以上: 70-95% (合并数据 + 保存数据库)
        
        当前任务流程：
        - Task 1: create_scan_workspace (创建工作空间)
        - Task 2: subdomain_discovery_flow (子域名发现)
          * Step 1: 并行运行扫描工具 (amass, subfinder 等)
          * Step 2: 合并并去重域名
          * Step 3: 流式保存到数据库
        
        注：状态更新由 Prefect Flow Handlers 自动管理，不再依赖 flow_run_names
        """
        if obj.status == 'successful':
            return 100
        
        if obj.status == 'initiated':
            return 0
        
        # 对于运行中、失败或中止的任务，基于创建时间估算进度
        if obj.status in ['running', 'failed', 'aborted']:
            # 计算已执行时长（秒）
            if obj.created_at:
                from django.utils import timezone
                elapsed_seconds = (timezone.now() - obj.created_at).total_seconds()
                
                # 基于时长估算进度
                if elapsed_seconds < 30:
                    # 前 30 秒：创建工作空间 + 启动工具 (10-30%)
                    progress = min(10 + int(elapsed_seconds * 0.67), 30)
                elif elapsed_seconds < 120:
                    # 30秒 - 2分钟：扫描工具执行 (30-70%)
                    progress = min(30 + int((elapsed_seconds - 30) * 0.44), 70)
                else:
                    # 2分钟以上：数据处理 (70-95%)
                    progress = min(70 + int((elapsed_seconds - 120) * 0.1), 95)
                
                # 失败或中止时，返回当前进度（不到 100%）
                if obj.status in ['failed', 'aborted']:
                    return progress
                
                # 运行中时，返回估算进度
                return progress
            else:
                # 没有创建时间，返回默认值
                return 10 if obj.status == 'running' else 0
        
        return 0
