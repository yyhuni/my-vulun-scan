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
    """
    网站快照
    
    记录：某次扫描中，某个子域名发现的网站
    """

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='website_snapshots',
        help_text='所属的扫描任务'
    )
    subdomain = models.ForeignKey(
        'Subdomain',
        on_delete=models.CASCADE,
        related_name='website_snapshots',
        help_text='所属子域名'
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
            models.Index(fields=['subdomain']),
            models.Index(fields=['scan', 'subdomain']),  # 组合查询
            models.Index(fields=['url']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            # 唯一约束：同一次扫描中，同一个子域名的同一个URL只能记录一次
            models.UniqueConstraint(
                fields=['scan', 'subdomain', 'url'],
                name='unique_website_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.url} (Scan #{self.scan_id})'


class PortSnapshot(models.Model):
    """
    端口快照（去重存储）
    
    记录：某次扫描中，某个 IP 上发现的端口
    通过 SubdomainPortSnapshotAssociation 中间表与 SubdomainSnapshot 建立多对多关系
    """

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='port_snapshots',
        help_text='所属的扫描任务'
    )
    ip_snapshot = models.ForeignKey(
        'IPAddressSnapshot',
        on_delete=models.CASCADE,
        related_name='port_snapshots',
        help_text='所属IP地址快照'
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
    
    # ==================== 多对多关系 ====================
    subdomain_snapshots = models.ManyToManyField(
        'SubdomainSnapshot',
        through='SubdomainPortSnapshotAssociation',
        related_name='port_snapshots',
        blank=True,
        help_text='关联的子域名快照（多对多关系）'
    )

    class Meta:
        db_table = 'port_snapshot'
        verbose_name = '端口快照'
        verbose_name_plural = '端口快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),
            models.Index(fields=['ip_snapshot', 'number']),     # IP+端口查询
            models.Index(fields=['number']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            # 唯一约束：同一次扫描中，IP快照+端口号唯一（去重存储）
            models.UniqueConstraint(
                fields=['scan', 'ip_snapshot', 'number'],
                name='unique_port_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'Port {self.number} (Scan #{self.scan_id})'


class DirectorySnapshot(models.Model):
    """
    目录快照
    
    记录：某次扫描中，某个网站发现的目录
    """

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='directory_snapshots',
        help_text='所属的扫描任务'
    )
    website = models.ForeignKey(
        'WebSite',
        on_delete=models.CASCADE,
        related_name='directory_snapshots',
        help_text='所属网站'
    )
    subdomain = models.ForeignKey(
        'Subdomain',
        on_delete=models.CASCADE,
        related_name='directory_snapshots',
        help_text='所属子域名（冗余字段，用于快速查询）'
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
            models.Index(fields=['website']),
            models.Index(fields=['subdomain']),
            models.Index(fields=['scan', 'website']),  # 组合查询
            models.Index(fields=['url']),
            models.Index(fields=['-discovered_at']),
        ]
        constraints = [
            # 唯一约束：同一次扫描中，同一个网站的同一个目录URL只能记录一次
            models.UniqueConstraint(
                fields=['scan', 'website', 'url'],
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
        help_text='关联的IP地址快照'
    )
    
    # ==================== 冗余字段（性能优化）====================
    subdomain_name = models.CharField(
        max_length=1000,
        blank=False,
        help_text='子域名（冗余字段，必须与 subdomain_snapshot.name 保持一致）'
    )
    ip = models.GenericIPAddressField(
        blank=False,
        help_text='IP地址字符串（冗余字段，必须与 ip_snapshot.ip 保持一致）'
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
            models.Index(fields=['subdomain_name']),                # 快速搜索子域名
            models.Index(fields=['subdomain_snapshot', 'ip']),      # 快速查询子域名的IP
            models.Index(fields=['subdomain_name', 'ip']),          # 覆盖查询
        ]
        constraints = [
            # 唯一约束：同一次扫描中，同一个子域名-IP关联只记录一次
            models.UniqueConstraint(
                fields=['scan', 'subdomain_snapshot', 'ip_snapshot'],
                name='unique_subdomain_ip_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.subdomain_name} -> {self.ip}'


class SubdomainPortSnapshotAssociation(models.Model):
    """
    子域名-端口快照关联表（多对多中间表）
    
    记录在快照中，子域名和端口之间的关联关系。
    """
    
    subdomain_snapshot = models.ForeignKey(
        'SubdomainSnapshot',
        on_delete=models.CASCADE,
        related_name='port_associations',
        help_text='关联的子域名快照'
    )
    port_snapshot = models.ForeignKey(
        'PortSnapshot',
        on_delete=models.CASCADE,
        related_name='subdomain_associations',
        help_text='关联的端口快照'
    )
    
    # ==================== 扫描上下文字段 ====================
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='subdomain_port_associations',
        null=True,
        blank=True,
        help_text='发现此关联的扫描任务（冗余字段，用于快速查询）'
    )
    
    # ==================== 冗余字段（性能优化）====================
    subdomain_name = models.CharField(
        max_length=1000,
        blank=False,
        help_text='子域名（冗余字段，必须与 subdomain_snapshot.name 保持一致）'
    )
    port_number = models.IntegerField(
        blank=False,
        help_text='端口号（冗余字段，必须与 port_snapshot.number 保持一致）'
    )
    ip = models.GenericIPAddressField(
        blank=False,
        help_text='IP地址字符串（冗余字段，必须与 port_snapshot.ip_snapshot.ip 保持一致）'
    )
    
    # ==================== 时间字段 ====================
    discovered_at = models.DateTimeField(
        auto_now_add=True,
        help_text='发现此关联的时间'
    )

    class Meta:
        db_table = 'subdomain_port_snapshot_association'
        verbose_name = '子域名-端口快照关联'
        verbose_name_plural = '子域名-端口快照关联'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['subdomain_snapshot']),
            models.Index(fields=['port_snapshot']),
            models.Index(fields=['scan']),
            models.Index(fields=['subdomain_name']),                         # 快速搜索子域名
            models.Index(fields=['subdomain_snapshot', 'port_number']),      # 快速查询子域名的端口号
            models.Index(fields=['subdomain_snapshot', 'ip']),               # 快速查询子域名的IP
            models.Index(fields=['subdomain_name', 'port_number']),          # 覆盖查询
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['scan', 'subdomain_snapshot', 'port_snapshot'],
                name='unique_subdomain_port_per_scan_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.subdomain_name} -> {self.ip}:{self.port_number}'


class HostPortAssociationSnapshot(models.Model):
    """
    主机端口关联快照表
    
    设计特点：
    - 存储某次扫描中发现的主机（host）、IP、端口的三元关联关系
    - 主关联 scan_id，记录扫描历史
    - scan + host + ip + port 组成复合唯一约束
    - 支持 TCP/UDP 协议和 TLS 标识
    """

    id = models.AutoField(primary_key=True)
    
    # ==================== 关联字段 ====================
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='host_port_association_snapshots',
        help_text='所属的扫描任务（主关联）'
    )
    
    # ==================== 核心字段 ====================
    host = models.CharField(
        max_length=1000,
        blank=False,
        help_text='主机名（域名或IP）'
    )
    ip = models.GenericIPAddressField(
        blank=False,
        help_text='IP地址'
    )
    port = models.IntegerField(
        blank=False,
        validators=[
            MinValueValidator(1, message='端口号必须大于等于1'),
            MaxValueValidator(65535, message='端口号必须小于等于65535')
        ],
        help_text='端口号（1-65535）'
    )
    
    # ==================== 时间字段 ====================
    discovered_at = models.DateTimeField(
        auto_now_add=True,
        help_text='发现时间'
    )

    class Meta:
        db_table = 'host_port_association_snapshot'
        verbose_name = '主机端口关联快照'
        verbose_name_plural = '主机端口关联快照'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['scan']),             # 优化按扫描查询
            models.Index(fields=['host']),             # 优化按主机名查询
            models.Index(fields=['ip']),               # 优化按IP查询
            models.Index(fields=['port']),             # 优化按端口查询
            models.Index(fields=['host', 'ip']),       # 优化组合查询
            models.Index(fields=['scan', 'host']),     # 优化扫描+主机查询
            models.Index(fields=['-discovered_at']),   # 优化时间排序
        ]
        constraints = [
            # 复合唯一约束：同一次扫描中，scan + host + ip + port 组合唯一
            models.UniqueConstraint(
                fields=['scan', 'host', 'ip', 'port'],
                name='unique_scan_host_ip_port_snapshot'
            ),
        ]

    def __str__(self):
        return f'{self.host} ({self.ip}:{self.port}) [Scan #{self.scan_id}]'