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

    started_at = models.DateTimeField(null=True, blank=True, help_text='扫描实际开始时间（第一个任务开始执行时）')
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

    class Meta:
        db_table = 'scan'
        verbose_name = '扫描任务'
        verbose_name_plural = '扫描任务'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['-started_at']),
            models.Index(fields=['target']),  # 优化按目标查询扫描任务
        ]

    def __str__(self):
        return f"Scan #{self.id} - {self.target.name}"
