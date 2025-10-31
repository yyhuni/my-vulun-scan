from django.db import models


class Organization(models.Model):
    """组织模型"""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=300, unique=True, blank=True, default='', help_text='组织名称')
    description = models.TextField(blank=True, default='', help_text='组织描述')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    targets = models.ManyToManyField(
        'Target',
        related_name='organizations',
        blank=True,
        help_text='所属目标列表'
    )

    class Meta:
        db_table = 'organization'
        verbose_name = '组织'
        verbose_name_plural = '组织'
        ordering = ['name']

    def __str__(self):
        return str(self.name or f'Organization {self.id}')


class Target(models.Model):
    """扫描目标模型

    核心模型，存储要扫描的目标信息。
    支持多种类型：域名、IP地址、CIDR范围等。
    """

    # ==================== 类型定义 ====================
    class TargetType(models.TextChoices):
        DOMAIN = 'domain', '域名'
        IP = 'ip', 'IP地址'
        CIDR = 'cidr', 'CIDR范围'

    # ==================== 基本字段 ====================
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=300, unique=True, blank=True, default='', help_text='目标标识（域名/IP/CIDR）')

    target_type = models.CharField(
        max_length=20,
        choices=TargetType.choices,
        default=TargetType.DOMAIN,
        db_index=True,
        help_text='目标类型'
    )

    description = models.TextField(blank=True, default='', help_text='目标描述')

    # ==================== 时间戳 ====================
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
    last_scanned_at = models.DateTimeField(null=True, blank=True, help_text='最后扫描时间')

    # ==================== 配置字段 ====================
    request_headers = models.JSONField(null=True, blank=True, help_text='自定义请求头配置')

    class Meta:
        db_table = 'target'
        verbose_name = '扫描目标'
        verbose_name_plural = '扫描目标'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['target_type']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return str(self.name or f'Target {self.id}')
