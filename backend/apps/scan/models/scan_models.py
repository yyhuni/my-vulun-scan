"""扫描相关模型"""

from django.db import models
from django.contrib.postgres.fields import ArrayField

from apps.common.definitions import ScanStatus


class SoftDeleteManager(models.Manager):
    """软删除管理器：默认只返回未删除的记录"""

    def get_queryset(self):
        """返回未删除记录的查询集"""
        return super().get_queryset().filter(deleted_at__isnull=True)


class Scan(models.Model):
    """扫描任务模型"""

    class ScanMode(models.TextChoices):
        """扫描模式枚举"""
        FULL = 'full', '完整扫描'
        QUICK = 'quick', '快速扫描'

    id = models.AutoField(primary_key=True)

    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='scans',
        help_text='扫描目标'
    )

    # 多引擎支持字段
    engine_ids = ArrayField(
        models.IntegerField(),
        default=list,
        help_text='引擎 ID 列表'
    )
    engine_names = models.JSONField(
        default=list,
        help_text='引擎名称列表，如 ["引擎A", "引擎B"]'
    )
    yaml_configuration = models.TextField(
        default='',
        help_text='YAML 格式的扫描配置'
    )

    # 扫描模式
    scan_mode = models.CharField(
        max_length=10,
        choices=ScanMode.choices,
        default=ScanMode.FULL,
        help_text='扫描模式：full=完整扫描，quick=快速扫描'
    )

    created_at = models.DateTimeField(auto_now_add=True, help_text='任务创建时间')
    stopped_at = models.DateTimeField(null=True, blank=True, help_text='扫描结束时间')

    status = models.CharField(
        max_length=20,
        choices=ScanStatus.choices,
        default=ScanStatus.INITIATED,
        db_index=True,
        help_text='任务状态'
    )

    results_dir = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='结果存储目录'
    )

    container_ids = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text='容器 ID 列表（Docker Container ID）'
    )

    worker = models.ForeignKey(
        'engine.WorkerNode',
        on_delete=models.SET_NULL,
        related_name='scans',
        null=True,
        blank=True,
        help_text='执行扫描的 Worker 节点'
    )

    error_message = models.CharField(
        max_length=2000,
        blank=True,
        default='',
        help_text='错误信息'
    )

    # 软删除字段
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='删除时间（NULL表示未删除）'
    )

    # 管理器
    objects = SoftDeleteManager()
    all_objects = models.Manager()

    # 进度跟踪字段
    progress = models.IntegerField(default=0, help_text='扫描进度 0-100')
    current_stage = models.CharField(max_length=50, blank=True, default='', help_text='当前扫描阶段')
    stage_progress = models.JSONField(default=dict, help_text='各阶段进度详情')

    # 缓存统计字段
    cached_subdomains_count = models.IntegerField(default=0, help_text='子域名数量')
    cached_websites_count = models.IntegerField(default=0, help_text='网站数量')
    cached_endpoints_count = models.IntegerField(default=0, help_text='端点数量')
    cached_ips_count = models.IntegerField(default=0, help_text='IP地址数量')
    cached_directories_count = models.IntegerField(default=0, help_text='目录数量')
    cached_screenshots_count = models.IntegerField(default=0, help_text='截图数量')
    cached_vulns_total = models.IntegerField(default=0, help_text='漏洞总数')
    cached_vulns_critical = models.IntegerField(default=0, help_text='严重漏洞数量')
    cached_vulns_high = models.IntegerField(default=0, help_text='高危漏洞数量')
    cached_vulns_medium = models.IntegerField(default=0, help_text='中危漏洞数量')
    cached_vulns_low = models.IntegerField(default=0, help_text='低危漏洞数量')
    stats_updated_at = models.DateTimeField(null=True, blank=True, help_text='统计数据最后更新时间')

    class Meta:
        """模型元数据配置"""
        db_table = 'scan'
        verbose_name = '扫描任务'
        verbose_name_plural = '扫描任务'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['target']),
            models.Index(fields=['deleted_at', '-created_at']),
        ]

    def __str__(self):
        return f"Scan #{self.id} - {self.target.name}"
