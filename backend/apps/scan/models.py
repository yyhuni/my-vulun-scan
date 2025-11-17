from django.db import models
from django.contrib.postgres.fields import ArrayField

from ..common.definitions import ScanStatus


class Scan(models.Model):
    """扫描任务模型"""

    id = models.AutoField(primary_key=True)

    target = models.ForeignKey('targets.Target', on_delete=models.CASCADE, related_name='scans', help_text='扫描目标')

    engine = models.ForeignKey(
        'engine.ScanEngine',
        on_delete=models.CASCADE,
        related_name='scans',
        help_text='使用的扫描引擎'
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

    results_dir = models.CharField(max_length=100, blank=True, default='', help_text='结果存储目录')

    flow_run_ids = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text='Prefect Flow Run ID 列表（第一个为主 Flow Run ID）'
    )

    flow_run_names = ArrayField(
        models.CharField(max_length=200),
        blank=True,
        default=list,
        help_text='Flow Run 名称列表'
    )

    error_message = models.CharField(max_length=2000, blank=True, default='', help_text='错误信息')

    # ==================== 缓存统计字段 ====================
    cached_subdomains_count = models.IntegerField(default=0, help_text='缓存的子域名数量')
    cached_websites_count = models.IntegerField(default=0, help_text='缓存的网站数量')
    cached_endpoints_count = models.IntegerField(default=0, help_text='缓存的端点数量')
    cached_ips_count = models.IntegerField(default=0, help_text='缓存的IP地址数量')
    cached_directories_count = models.IntegerField(default=0, help_text='缓存的目录数量')
    stats_updated_at = models.DateTimeField(null=True, blank=True, help_text='统计数据最后更新时间')

    class Meta:
        db_table = 'scan'
        verbose_name = '扫描任务'
        verbose_name_plural = '扫描任务'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),  # 优化按创建时间降序排序（list 查询的默认排序）
            models.Index(fields=['target']),  # 优化按目标查询扫描任务
        ]

    def __str__(self):
        return f"Scan #{self.id} - {self.target.name}"