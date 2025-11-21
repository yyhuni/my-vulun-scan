from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator


class SubdomainSnapshot(models.Model):
    """子域名扫描快照 - 镜像 Subdomain 模型结构"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='subdomain_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 镜像原表字段（去掉外键，保持字段名一致）
    name = models.CharField(max_length=1000, help_text='子域名名称')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
    
    # 子域名探测结果字段
    cname = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        default=list,
        help_text='CNAME记录列表'
    )
    is_cdn = models.BooleanField(default=False, help_text='是否使用CDN')
    cdn_name = models.CharField(max_length=200, blank=True, default='', help_text='CDN提供商')

    class Meta:
        db_table = 'subdomain_snapshot'
        verbose_name = '子域名快照'
        verbose_name_plural = '子域名快照'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['name']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'{self.name} (Scan #{self.scan_id})'


class WebsiteSnapshot(models.Model):
    """网站扫描快照 - 镜像 Website 模型结构"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='website_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 镜像原表字段
    url = models.CharField(max_length=2000, help_text='站点URL')
    title = models.CharField(max_length=500, blank=True, default='', help_text='页面标题')
    status = models.IntegerField(null=True, blank=True, help_text='HTTP状态码')
    content_length = models.BigIntegerField(null=True, blank=True, help_text='内容长度')
    location = models.CharField(max_length=1000, blank=True, default='', help_text='重定向位置')
    web_server = models.CharField(max_length=200, blank=True, default='', help_text='Web服务器')
    content_type = models.CharField(max_length=200, blank=True, default='', help_text='内容类型')
    tech = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text='技术栈'
    )
    body_preview = models.TextField(blank=True, default='', help_text='响应体预览')
    vhost = models.BooleanField(null=True, blank=True, help_text='虚拟主机标志')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'website_snapshot'
        verbose_name = '网站快照'
        verbose_name_plural = '网站快照'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['url']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'{self.url} (Scan #{self.scan_id})'


class PortSnapshot(models.Model):
    """端口扫描快照 - 镜像 Port 模型结构"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='port_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 镜像原表字段
    number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(65535)],
        help_text='端口号'
    )
    protocol = models.CharField(max_length=10, default='tcp', help_text='协议类型')
    state = models.CharField(max_length=20, blank=True, default='', help_text='端口状态')
    service = models.CharField(max_length=100, blank=True, default='', help_text='服务名称')
    version = models.CharField(max_length=200, blank=True, default='', help_text='服务版本')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'port_snapshot'
        verbose_name = '端口快照'
        verbose_name_plural = '端口快照'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['number']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'Port {self.number} (Scan #{self.scan_id})'


class DirectorySnapshot(models.Model):
    """目录扫描快照 - 镜像 Directory 模型结构"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='directory_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 镜像原表字段
    url = models.CharField(max_length=2000, help_text='目录URL')
    status = models.IntegerField(null=True, blank=True, help_text='HTTP状态码')
    content_length = models.BigIntegerField(null=True, blank=True, help_text='内容长度')
    location = models.CharField(max_length=1000, blank=True, default='', help_text='重定向位置')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'directory_snapshot'
        verbose_name = '目录快照'
        verbose_name_plural = '目录快照'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['url']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'{self.url} (Scan #{self.scan_id})'