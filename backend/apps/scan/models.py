from django.db import models
from django.contrib.postgres.fields import ArrayField

from ..common.definitions import ScanTaskStatus
from ..asset.models import Email, Employee, Dork, S3Bucket


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

    status = models.IntegerField(
        choices=ScanTaskStatus.choices,
        default=ScanTaskStatus.INITIATED,
        db_index=True,
        help_text='任务状态'
    )

    results_dir = models.CharField(max_length=100, blank=True, default='', help_text='结果存储目录')

    task_ids = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text='Celery 任务 ID 列表'
    )

    task_names = ArrayField(
        models.CharField(max_length=200),
        blank=True,
        default=list,
        help_text='任务列表名称'
    )

    error_message = models.CharField(max_length=300, blank=True, default='', help_text='错误信息')

    # 扫描发现的资产关联
    emails = models.ManyToManyField(
        Email,
        blank=True,
        related_name='scans',
        help_text='发现的邮箱'
    )

    employees = models.ManyToManyField(
        Employee,
        blank=True,
        related_name='scans',
        help_text='发现的员工信息'
    )

    dorks = models.ManyToManyField(
        Dork,
        blank=True,
        related_name='scans',
        help_text='发现的 Google Dorks'
    )

    s3_buckets = models.ManyToManyField(
        S3Bucket,
        blank=True,
        related_name='scans',
        help_text='发现的 S3 存储桶'
    )

    class Meta:
        db_table = 'scan'
        verbose_name = '扫描任务'
        verbose_name_plural = '扫描任务'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['-started_at']),
        ]

    def __str__(self):
        return f"Scan #{self.id} - {self.target.name}"


class ScanTask(models.Model):
    """
    扫描记录模型 - 记录扫描过程中每个任务的执行情况
    """
    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'Scan',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        help_text='所属的扫描任务'
    )

    name = models.CharField(max_length=1000, help_text='任务名称')
    description = models.TextField(blank=True, default='', help_text='任务描述')

    status = models.IntegerField(
        choices=ScanTaskStatus.choices,
        default=ScanTaskStatus.INITIATED,
        db_index=True,
        help_text='任务状态'
    )

    updated_at = models.DateTimeField(auto_now=True, help_text='任务更新时间')
    error_message = models.CharField(max_length=300, blank=True, default='', help_text='任务失败时的错误信息（限制300字符）')
    error_traceback = models.TextField(blank=True, default='', help_text='完整的错误堆栈信息（用于调试）')

    # Celery 任务ID（用于追踪异步任务）
    task_id = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,  # 添加索引，用于 update_or_create 查询优化
        help_text='Celery 异步任务的唯一标识符'
    )

    class Meta:
        db_table = 'scan_task'
        verbose_name = '扫描记录'
        verbose_name_plural = '扫描记录'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['scan', 'task_id']),  # 组合索引：优化 update_or_create 查询
            models.Index(fields=['scan', 'status']),   # 组合索引：优化状态查询
        ]

    def __str__(self):
        return str(self.name or f'ScanTask #{self.id}')
