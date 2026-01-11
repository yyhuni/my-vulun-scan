"""
扫描输入目标模型

存储快速扫描时用户输入的目标，支持大量数据（1万+）的分块迭代。
用于快速扫描的第一阶段。
"""

from django.db import models


class ScanInputTarget(models.Model):
    """扫描输入目标表"""

    class InputType(models.TextChoices):
        """输入类型枚举"""
        DOMAIN = 'domain', '域名'
        IP = 'ip', 'IP地址'
        CIDR = 'cidr', 'CIDR'
        URL = 'url', 'URL'

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='input_targets',
        help_text='所属的扫描任务'
    )
    value = models.CharField(max_length=2000, help_text='用户输入的原始值')
    input_type = models.CharField(
        max_length=10,
        choices=InputType.choices,
        help_text='输入类型'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        """模型元数据"""
        db_table = 'scan_input_target'
        verbose_name = '扫描输入目标'
        verbose_name_plural = '扫描输入目标'
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['input_type']),
        ]

    def __str__(self):
        return f"ScanInputTarget #{self.id} - {self.value} ({self.input_type})"
