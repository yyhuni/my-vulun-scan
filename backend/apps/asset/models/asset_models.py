
from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator


class SoftDeleteManager(models.Manager):
    """软删除管理器：默认只返回未删除的记录"""
    
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)


class Subdomain(models.Model):
    """
    子域名模型（纯资产表）
    
    设计特点：
    - 只存储子域名资产信息
    - 与其他资产表（IPAddress、Port）无直接关联
    - 扫描历史记录存储在 SubdomainSnapshot 快照表中
    """

    id = models.AutoField(primary_key=True)
    target = models.ForeignKey(
        'targets.Target',  # 使用字符串引用避免循环导入
        on_delete=models.CASCADE,
        related_name='subdomains',
        help_text='所属的扫描目标（主关联字段，表示所属关系，不能为空）'
    )
    name = models.CharField(max_length=1000, help_text='子域名名称')
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='首次发现时间')
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text='删除时间（NULL表示未删除）')
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'subdomain'
        verbose_name = '子域名'
        verbose_name_plural = '子域名'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['name', 'target']),  # 复合索引，优化 get_by_names_and_target_id 批量查询
            models.Index(fields=['target']),     # 优化从target_id快速查找下面的子域名
            models.Index(fields=['name']),            # 优化从name快速查找子域名，搜索场景
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ]
        constraints = [
            # 部分唯一约束：只对未删除记录生效
            models.UniqueConstraint(
                fields=['name', 'target'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_name_target_active'
            )
        ]

    def __str__(self):
        return str(self.name or f'Subdomain {self.id}')


class Endpoint(models.Model):
    """端点模型"""

    id = models.AutoField(primary_key=True)
    website = models.ForeignKey(
        'WebSite',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='endpoints',
        help_text='所属的站点（主关联字段，表示所属关系，不能为空）'
    )
    target = models.ForeignKey(
        'targets.Target',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='endpoints',
        null=True,
        blank=True,
        help_text='所属的扫描目标（冗余字段，用于快速查询）'
    )
    scan = models.ForeignKey(
        'scan.Scan',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='endpoints',
        null=True,
        blank=True,
        help_text='所属的扫描任务（冗余字段，用于快速查询）'
    )
    
    url = models.CharField(
        max_length=2000,
        help_text='完整的HTTP URL（如 http://api.example.com/v1/users）'
    )
    host = models.CharField(
        max_length=500,
        # 默认就是 null=False, blank=False
        help_text='从 URL 提取的主机名（如 api.example.com 或 api.example.com:8080），用于快速查询和分组'
    )
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')
    content_length = models.IntegerField(
        null=True,
        blank=True,
        help_text='HTTP响应体大小（字节），由httpx或ffuf探测获取'
    )
    page_title = models.CharField(
        max_length=1000,
        default='',
        blank=True,
        help_text='网页标题（HTML title标签内容），由httpx探测获取'
    )
    status_code = models.IntegerField(
        null=True,
        blank=True,
        help_text='HTTP响应状态码（如200, 404, 500等），由httpx或ffuf探测获取'
    )
    content_type = models.CharField(
        max_length=100,
        default='',
        blank=True,
        help_text='HTTP响应的Content-Type（如text/html, application/json等），由httpx探测获取'
    )
    response_time = models.FloatField(
        null=True,
        blank=True,
        help_text='HTTP响应时间（秒），用于性能分析，由httpx探测获取'
    )
    webserver = models.CharField(
        max_length=1000,
        default='',
        blank=True,
        help_text='Web服务器信息（如nginx/1.19.0, Apache/2.4.41等），从Server响应头获取'
    )
    is_default = models.BooleanField(
        default=False,
        help_text='是否为子域名的默认根端点（如 http://api.example.com/）'
    )
    matched_gf_patterns = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text='匹配的GF模式列表，用于识别敏感端点（如api, debug, config等）'
    )
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text='删除时间（NULL表示未删除）')
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'endpoint'
        verbose_name = '端点'
        verbose_name_plural = '端点'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['website']),      # 优化主关联查询（website.endpoints.all()）
            models.Index(fields=['scan']),         # 优化从scan_id快速查找下面的端点（冗余字段）
            models.Index(fields=['target']),       # 优化从target_id快速查找下面的端点（冗余字段）
            models.Index(fields=['host']),         # 优化通过 host 查询端点
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ]
        constraints = [
            # 部分唯一约束：只对未删除记录生效
            models.UniqueConstraint(
                fields=['url', 'website'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_url_website_active'
            )
        ]

    def __str__(self):
        return str(self.url or f'Endpoint {self.id}')


class WebSite(models.Model):
    """站点模型"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='websites',
        null=True,
        blank=True,
        help_text='所属的扫描任务（冗余字段，用于快速查询）'
    )
    target = models.ForeignKey(
        'targets.Target',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='websites',
        null=True,
        blank=True,
        help_text='所属的扫描目标（冗余字段，用于快速查询）'
    )
    subdomain = models.ForeignKey(
        'Subdomain',  # 同一个 app 内的模型也使用字符串引用
        on_delete=models.CASCADE,
        related_name='websites',
        help_text='所属的子域名（主关联字段，表示所属关系，不能为空）'
    )

    url = models.CharField(max_length=2000, help_text='最终访问的完整URL')
    location = models.CharField(
        max_length=1000,
        blank=True,
        default='',
        help_text='重定向地址（HTTP 3xx 响应头 Location）'
    )
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')
    title = models.CharField(
        max_length=1000,
        blank=True,
        default='',
        help_text='网页标题（HTML <title> 标签内容）'
    )
    webserver = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='服务器类型（HTTP 响应头 Server 值）'
    )
    body_preview = models.CharField(
        max_length=1000,
        blank=True,
        default='',
        help_text='响应正文前N个字符（默认100个字符）'
    )
    content_type = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='响应类型（HTTP Content-Type 响应头）'
    )
    tech = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        help_text='技术栈（服务器/框架/语言等）'
    )
    status_code = models.IntegerField(
        null=True,
        blank=True,
        help_text='HTTP状态码'
    )
    content_length = models.IntegerField(
        null=True,
        blank=True,
        help_text='响应体大小（单位字节）'
    )
    vhost = models.BooleanField(
        null=True,
        blank=True,
        help_text='是否支持虚拟主机'
    )
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text='删除时间（NULL表示未删除）')
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'website'
        verbose_name = '站点'
        verbose_name_plural = '站点'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['url']),  # URL索引，优化查询性能
            models.Index(fields=['target']),     # 优化从target_id快速查找下面的站点
            models.Index(fields=['scan']),         # 优化从scan_id快速查找下面的站点
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ]
        constraints = [
            # 部分唯一约束：只对未删除记录生效
            models.UniqueConstraint(
                fields=['url', 'subdomain'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_url_subdomain_active'
            )
        ]

    def __str__(self):
        return str(self.url or f'Website {self.id}')


class IPAddress(models.Model):
    """
    IP地址模型（独立存储）
    
    设计特点：
    - IP地址独立存储，避免重复
    - 与其他资产表（Subdomain、Port）无直接关联
    """

    id = models.AutoField(primary_key=True)
    
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
    
    # ==================== 时间字段 ====================
    discovered_at = models.DateTimeField(
        auto_now_add=True, 
        help_text='首次发现时间'
    )
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(
        null=True, 
        blank=True, 
        db_index=True, 
        help_text='删除时间（NULL表示未删除）'
    )
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'ip_address'
        verbose_name = 'IP地址'
        verbose_name_plural = 'IP地址'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['ip']),  # IP地址索引
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ]
        constraints = [
            # 唯一约束：每个IP地址只能有一条记录（未删除状态下）
            models.UniqueConstraint(
                fields=['ip'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_ip_active'
            ),
        ]

    def __str__(self):
        return self.ip


class Port(models.Model):
    """
    端口模型（去重存储）
    
    设计特点：
    - 记录某个 IP 地址上发现的端口
    - 通过 ip_address 外键关联到 IPAddress
    """

    id = models.AutoField(primary_key=True)
    ip_address = models.ForeignKey(
        'IPAddress',
        on_delete=models.CASCADE,
        related_name='ports',
        help_text='所属的IP地址（主关联字段，表示所属关系，不能为空）'
    )
    number = models.IntegerField(
        null=False,
        blank=False,
        validators=[
            MinValueValidator(1, message='端口号必须大于等于1'),
            MaxValueValidator(65535, message='端口号必须小于等于65535')
        ],
        help_text='端口号（1-65535）'
    )
    description = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='端口描述（如http, https, ssh, ftp等）'
    )
    service_name = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='服务名称（如http, https, ssh, ftp等）'
    )
    is_uncommon = models.BooleanField(
        default=False,
        help_text='是否为不常见端口'
    )
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='首次发现时间')
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text='删除时间（NULL表示未删除）')
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'port'
        verbose_name = '端口'
        verbose_name_plural = '端口'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['ip_address', 'number']),     # IP+端口查询
            models.Index(fields=['number']),                   # 端口查询
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ],
        constraints = [
            # 部分唯一约束：IP+端口号唯一（去重存储，只对未删除记录生效）
            models.UniqueConstraint(
                fields=['ip_address', 'number'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_ip_port_active'
            ),
        ]

    def __str__(self):
        return f'{self.ip_address.ip}:{self.number}'
class Directory(models.Model):
    """
    目录模型
    """

    id = models.AutoField(primary_key=True)
    website = models.ForeignKey(
        'Website',
        on_delete=models.CASCADE,
        related_name='directories',
        help_text='所属的站点（主关联字段，表示所属关系，不能为空）'
    )
    target = models.ForeignKey(
        'targets.Target',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='directories',
        null=True,
        blank=True,
        help_text='所属的扫描目标（冗余字段，用于快速查询）'
    )
    scan = models.ForeignKey(
        'scan.Scan',  # 使用字符串引用
        on_delete=models.CASCADE,
        related_name='directories',
        null=True,
        blank=True,
        help_text='所属的扫描任务（冗余字段，用于快速查询）'
    )
    
    url = models.CharField(
        null=False,
        blank=False,
        max_length=2000,
        help_text='完整请求 URL'
    )
    status = models.IntegerField(
        null=True,
        blank=True,
        help_text='HTTP 响应状态码'
    )
    length = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='响应体字节大小（Content-Length 或实际长度）'
    )
    words = models.IntegerField(
        null=True,
        blank=True,
        help_text='响应体中单词数量（按空格分割）'
    )
    lines = models.IntegerField(
        null=True,
        blank=True,
        help_text='响应体行数（按换行符分割）'
    )
    content_type = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='响应头 Content-Type 值'
    )
    duration = models.BigIntegerField(
        null=True,
        blank=True,
        help_text='请求耗时（单位：纳秒）'
    )
    
    discovered_at = models.DateTimeField(auto_now_add=True, help_text='发现时间')
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True, help_text='删除时间（NULL表示未删除）')
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'directory'
        verbose_name = '目录'
        verbose_name_plural = '目录'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['-discovered_at']),
            models.Index(fields=['scan']),         # 优化从scan_id快速查找下面的目录
            models.Index(fields=['target']),     # 优化从target_id快速查找下面的目录
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ]
        constraints = [
            # 部分唯一约束：只对未删除记录生效
            models.UniqueConstraint(
                fields=['website', 'url'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_directory_url_website_active'
            ),
        ]

    def __str__(self):
        return str(self.url or f'Directory {self.id}')


class HostPortAssociation(models.Model):
    """
    主机端口关联表
    
    设计特点：
    - 存储主机（host）、IP、端口的三元关联关系
    - 只关联 target_id，不关联其他资产表
    - target + host + ip + port 组成复合唯一约束
    - 支持 TCP/UDP 协议和 TLS 标识
    """

    id = models.AutoField(primary_key=True)
    
    # ==================== 关联字段 ====================
    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='host_port_associations',
        help_text='所属的扫描目标'
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
    
    # ==================== 扩展字段 ====================
    protocol = models.CharField(
        max_length=10,
        default='tcp',
        blank=True,
        help_text='协议类型（tcp/udp）'
    )
    tls = models.BooleanField(
        default=False,
        help_text='是否支持TLS/SSL'
    )
    
    # ==================== 时间字段 ====================
    discovered_at = models.DateTimeField(
        auto_now_add=True,
        help_text='发现时间'
    )
    
    # ==================== 软删除字段 ====================
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='删除时间（NULL表示未删除）'
    )
    
    # ==================== 管理器 ====================
    objects = SoftDeleteManager()  # 默认管理器：只返回未删除的记录
    all_objects = models.Manager()  # 全量管理器：包括已删除的记录（用于硬删除）

    class Meta:
        db_table = 'host_port_association'
        verbose_name = '主机端口关联'
        verbose_name_plural = '主机端口关联'
        ordering = ['-discovered_at']
        indexes = [
            models.Index(fields=['target']),           # 优化按目标查询
            models.Index(fields=['host']),             # 优化按主机名查询
            models.Index(fields=['ip']),               # 优化按IP查询
            models.Index(fields=['port']),             # 优化按端口查询
            models.Index(fields=['host', 'ip']),       # 优化组合查询
            models.Index(fields=['-discovered_at']),   # 优化时间排序
            models.Index(fields=['deleted_at', '-discovered_at']),  # 软删除 + 时间索引
        ]
        constraints = [
            # 复合唯一约束：target + host + ip + port 组合唯一（只对未删除记录生效）
            models.UniqueConstraint(
                fields=['target', 'host', 'ip', 'port'],
                condition=models.Q(deleted_at__isnull=True),
                name='unique_target_host_ip_port_active'
            ),
        ]

    def __str__(self):
        return f'{self.host} ({self.ip}:{self.port})'
