from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator


class SubdomainSnapshot(models.Model):
    """子域名快照"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='subdomain_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 扫描结果数据（原始值，不维护外键关联）
    name = models.CharField(max_length=1000, help_text='子域名名称')
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')
    
    class Meta:
        db_table = 'subdomain_snapshot'
        verbose_name = '子域名快照'
        verbose_name_plural = '子域名快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['name']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            # 唯一约束：同一次扫描中，同一个子域名只能记录一次
            models.UniqueConstraint(
                fields=['scan', 'name'],
                name='unique_subdomain_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.name} (Scan #{self.scan_id})'

class IPAddressSnapshot(models.Model):
    """IP地址快照"""
    
    id = models.AutoField(primary_key=True)
    
    # 扫描关联
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='ip_address_snapshots',
        help_text='所属的扫描任务'
    )
    
    # ==================== 核心字段 ====================
    ip = models.CharField(
        max_length=500,
        blank=False,
        null=False,
        help_text='IP地址'
    )
    protocol_version = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='协议版本（如IPv4, IPv6）'
    )
    is_private = models.BooleanField(
        default=False, 
        help_text='是否私有IP地址'
    )
    
    # ==================== 扩展信息 ====================
    reverse_pointer = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='反向DNS解析结果'
    )
    
    # ==================== 多对多关系 ====================
    subdomain_snapshots = models.ManyToManyField(
        'SubdomainSnapshot',
        through='SubdomainIPSnapshotAssociation',
        related_name='ip_address_snapshots',
        blank=True,
        help_text='关联的子域名快照（多对多关系）'
    )
    
    # ==================== 时间字段 ====================
    discovered_at = models.DateTimeField(
        auto_now_add=True, 
        help_text='首次发现时间'
    )

    class Meta:
        db_table = 'ip_address_snapshot'
        verbose_name = 'IP地址快照'
        verbose_name_plural = 'IP地址快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['ip']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['scan', 'ip'],
                name='unique_ip_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.ip} (Scan #{self.scan_id})'

    

class WebsiteSnapshot(models.Model):
    """网站快照"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='website_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 扫描结果数据
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
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')

    class Meta:
        db_table = 'website_snapshot'
        verbose_name = '网站快照'
        verbose_name_plural = '网站快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['url']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            # 唯一约束：同一次扫描中，同一个URL只能记录一次
            models.UniqueConstraint(
                fields=['scan', 'url'],
                name='unique_website_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.url} (Scan #{self.scan_id})'


class PortSnapshot(models.Model):
    """端口快照"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='port_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 扫描结果数据
    number = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(65535)],
        help_text='端口号'
    )
    protocol = models.CharField(max_length=10, default='tcp', help_text='协议类型')
    state = models.CharField(max_length=20, blank=True, default='', help_text='端口状态')
    service = models.CharField(max_length=100, blank=True, default='', help_text='服务名称')
    version = models.CharField(max_length=200, blank=True, default='', help_text='服务版本')
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')

    class Meta:
        db_table = 'port_snapshot'
        verbose_name = '端口快照'
        verbose_name_plural = '端口快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['number']),
            models.Index(fields=['-discovered_at']),
        ]

    def __str__(self):
        return f'Port {self.number} (Scan #{self.scan_id})'


class DirectorySnapshot(models.Model):
    """目录快照"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='directory_snapshots',
        help_text='所属的扫描任务'
    )
    
    # 扫描结果数据
    url = models.CharField(max_length=2000, help_text='目录URL')
    status = models.IntegerField(null=True, blank=True, help_text='HTTP状态码')
    content_length = models.BigIntegerField(null=True, blank=True, help_text='内容长度')
    location = models.CharField(max_length=1000, blank=True, default='', help_text='重定向位置')
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')

    class Meta:
        db_table = 'directory_snapshot'
        verbose_name = '目录快照'
        verbose_name_plural = '目录快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['url']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            # 唯一约束：同一次扫描中，同一个目录URL只能记录一次
            models.UniqueConstraint(
                fields=['scan', 'url'],
                name='unique_directory_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.url} (Scan #{self.scan_id})'


class SubdomainIPSnapshotAssociation(models.Model):
    """
    子域名-IP快照关联表（多对多中间表）
    
    用于记录在快照中，子域名和IP地址之间的关联关系
    """
    
    subdomain_snapshot = models.ForeignKey(
        'SubdomainSnapshot',
        on_delete=models.CASCADE,
        related_name='ip_associations',
        help_text='关联的子域名快照'
    )
    ip_snapshot = models.ForeignKey(
        'IPAddressSnapshot',
        on_delete=models.CASCADE,
        related_name='subdomain_associations',
        help_text='关联的IP快照'
    )

    # ==================== 扫描上下文字段 ====================
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='subdomain_ip_associations',
        null=True,
        blank=True,
        help_text='发现此关联的扫描任务（冗余字段，用于快速查询）'
    )
    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='subdomain_ip_associations',
        null=True,
        blank=True,
        help_text='所属的扫描目标（冗余字段，用于快速查询）'
    )
    
    
    # ==================== 时间字段 ====================
    discovered_at = models.DateTimeField(
        auto_now_add=True,
        help_text='发现此关联的时间'
    )

    class Meta:
        db_table = 'subdomain_ip_snapshot_association'
        verbose_name = '子域名-IP快照关联'
        verbose_name_plural = '子域名-IP快照关联'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['subdomain_snapshot']),
            models.Index(fields=['ip_snapshot']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['subdomain_snapshot', 'ip_snapshot'],
                name='unique_subdomain_ip_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.subdomain_snapshot.name} -> {self.ip_snapshot.ip}'