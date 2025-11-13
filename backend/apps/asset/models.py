
from django.db import models
from django.contrib.postgres.fields import ArrayField


class Subdomain(models.Model):
    """子域名模型"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='subdomains',
        null=True,
        blank=True,
        help_text='所属的扫描任务'
    )
    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='subdomains',
        help_text='所属的扫描目标'
    )
    name = models.CharField(max_length=1000, help_text='子域名名称')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间，也就是首次发现时间')
    cname = ArrayField(
        models.CharField(max_length=255),
        blank=True,
        default=list,
        help_text='CNAME记录列表，由httpx探测获取'
    )
    is_cdn = models.BooleanField(
        default=False,
        help_text='是否使用CDN（由httpx的cdn探测标志判断）'
    )
    cdn_name = models.CharField(
        max_length=200,
        blank=True,
        default='',
        help_text='CDN提供商名称（如cloudflare, akamai等）'
    )

    class Meta:
        db_table = 'subdomain'
        verbose_name = '子域名'
        verbose_name_plural = '子域名'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['name', 'target_id']),  # 复合索引，优化 get_by_names 批量查询
            models.Index(fields=['target_id']),
            models.Index(fields=['scan_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'target_id'],
                name='unique_subdomain_per_scan'
            )
        ]

    def __str__(self):
        return str(self.name or f'Subdomain {self.id}')


class Endpoint(models.Model):
    """端点模型"""

    id = models.AutoField(primary_key=True)
    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='endpoints',
        help_text='所属的扫描目标'
    )
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='endpoints',
        null=True,
        blank=True,
        help_text='所属的扫描任务'
    )
    subdomain = models.ForeignKey(
        'Subdomain',
        on_delete=models.CASCADE,
        related_name='endpoints',
        null=True,
        blank=True,
        help_text='所属的子域名'
    )
    technology = models.ManyToManyField(
        'Technology',
        related_name='endpoints',
        blank=True,
        help_text='所属的站点技术'
    )
    url = models.TextField(
        help_text='完整的HTTP URL（如 http://api.example.com/v1/users）'
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
    content_length = models.IntegerField(
        null=True,
        blank=True,
        help_text='HTTP响应体大小（字节），由httpx或ffuf探测获取'
    )
    page_title = models.TextField(
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

    class Meta:
        db_table = 'endpoint'
        verbose_name = '端点'
        verbose_name_plural = '端点'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return str(self.url or f'Endpoint {self.id}')


class WebSite(models.Model):
    """站点模型"""

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='websites',
        null=True,
        blank=True,
        help_text='所属的扫描任务'
    )
    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='websites',
        null=True,
        blank=True,
        help_text='所属的扫描目标'
    )
    subdomain = models.ForeignKey(
        'Subdomain',
        on_delete=models.CASCADE,
        related_name='websites',
        null=True,
        blank=True,
        help_text='所属的子域名'
    )

    url = models.CharField(max_length=1000, help_text='最终访问的完整URL')
    location = models.CharField(
        max_length=1000,
        blank=True,
        default='',
        help_text='重定向地址（HTTP 3xx 响应头 Location）'
    )
    created_at = models.DateTimeField(null=True, blank=True, help_text='扫描或探测时间')
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
    body_preview = models.TextField(
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

    class Meta:
        db_table = 'website'
        verbose_name = '站点'
        verbose_name_plural = '站点'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['url']),  # URL索引，优化查询性能
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['url'],
                name='unique_website_url'
            )
        ]

    def __str__(self):
        return str(self.url or f'Website {self.id}')


class Technology(models.Model):
    """站点技术模型"""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=500, blank=True, default='', help_text='技术名称')

    class Meta:
        db_table = 'technology'
        verbose_name = '站点技术'
        verbose_name_plural = '站点技术'

    def __str__(self):
        return str(self.name or f'Technology {self.id}')


class IPAddress(models.Model):
    """
    IP地址模型
    
    来源：
        - 端口扫描的附带产物（主要来源）
        - 其他 IP 发现工具
    
    关联关系：
        - 属于 Subdomain（必需，层级关系）
        - 属于 Target（冗余，但用于快速查询）
    
    注意：
        target 字段是性能优化，避免通过 subdomain JOIN 查询
    """

    id = models.AutoField(primary_key=True)
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='ip_addresses',
        null=True,
        blank=True,
        help_text='所属的扫描任务'
    )
    target = models.ForeignKey(
        'targets.Target',
        on_delete=models.CASCADE,
        related_name='ip_addresses',
        null=True,
        blank=True,
        help_text='所属的扫描目标'
    )
    subdomain = models.ForeignKey(
        'Subdomain',
        on_delete=models.CASCADE,
        related_name='ip_addresses',
        null=True,
        blank=True,
        help_text='所属的子域名'
    )
    ip = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='IP地址'
    )
    protocol_version = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='协议版本（如IPv4, IPv6）'
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
    is_private = models.BooleanField(default=False, help_text='是否私有IP')
    reverse_pointer = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='反向解析（如域名）'
    )

    class Meta:
        db_table = 'ip_address'
        verbose_name = 'IP地址'
        verbose_name_plural = 'IP地址'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['subdomain', 'ip'],
                name='unique_ip_per_subdomain'
            ),
        ]


    def __str__(self):
        return str(self.ip or f'IPAddress {self.id}')


class Port(models.Model):
    """
    端口模型
    
    来源：
        - 端口扫描工具（naabu, masscan, nmap等）
    
    关联关系：
        - 属于 IPAddress（必需，端口属于IP）
        - 属于 Subdomain（冗余，用于快速查询）
    
    数据层级：
        Target → Subdomain → IPAddress → Port
    
    注意：
        - subdomain 字段是性能优化，避免通过 ip 多次 JOIN
        - 端口直接属于 IP，而不是域名（同一域名可能有多个IP）
    """

    id = models.AutoField(primary_key=True)
    ip = models.ForeignKey(
        'IPAddress',
        on_delete=models.CASCADE,
        related_name='ports',
        null=True,
        blank=True,
        help_text='所属的IP地址'
    )
    subdomain = models.ForeignKey(
        'Subdomain',
        on_delete=models.CASCADE,
        related_name='ports',
        null=True,
        blank=True,
        help_text='所属的子域名'
    )
    number = models.IntegerField(
        null=True,
        blank=True,
        help_text='端口号'
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
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'port'
        verbose_name = '端口'
        verbose_name_plural = '端口'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['ip', 'number'],
                name='unique_port_per_ip'
            ),
        ]

    def __str__(self):
        return str(self.number or f'Port {self.id}')


class DirectoryScan(models.Model):
    """目录扫描模型"""

    id = models.AutoField(primary_key=True)
    ffuf_command = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='ffuf命令'
    )
    start_scan_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='开始扫描时间'
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'directory_scan'
        verbose_name = '目录扫描'
        verbose_name_plural = '目录扫描'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return str(self.ffuf_command or f'DirectoryScan {self.id}')

class DiscoveredPath(models.Model):
    """目录扫描结果模型"""

    id = models.AutoField(primary_key=True)
    directory_scan = models.ForeignKey(
        'DirectoryScan',
        on_delete=models.CASCADE,
        related_name='discovered_paths',
        null=True,
        blank=True,
        help_text='所属的目录扫描'
    )
    website = models.ForeignKey(
        'WebSite',
        on_delete=models.CASCADE,
        related_name='discovered_paths',
        null=True,
        blank=True,
        help_text='所属的站点'
    )
    scan = models.ForeignKey(
        'scan.Scan',
        on_delete=models.CASCADE,
        related_name='discovered_paths',
        null=True,
        blank=True,
        help_text='所属的扫描任务'
    )
    length = models.IntegerField(
        null=True,
        blank=True,
        help_text='长度'
    )
    lines = models.IntegerField(
        null=True,
        blank=True,
        help_text='行数'
    )
    words = models.IntegerField(
        null=True,
        blank=True,
        help_text='单词数'
    )
    status_code = models.IntegerField(
        null=True,
        blank=True,
        help_text='HTTP状态码'
    )
    name = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text='路径名称'
    )
    url = models.CharField(
        max_length=5000,
        blank=True,
        default='',
        help_text='URL地址'
    )
    content_type = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text='内容类型'
    )
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'discovered_path'
        verbose_name = '目录扫描结果'
        verbose_name_plural = '目录扫描结果'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return str(self.name or f'DiscoveredPath {self.id}')


class Email(models.Model):
    """邮箱模型"""

    id = models.AutoField(primary_key=True)
    address = models.CharField(max_length=200, blank=True, default='', help_text='邮箱地址')
    password = models.CharField(max_length=200, blank=True, default='', help_text='邮箱密码')

    class Meta:
        """Email 模型的元数据配置"""
        db_table = 'email'
        verbose_name = '邮箱'
        verbose_name_plural = '邮箱'

    def __str__(self):
        return str(self.address or f'Email {self.id}')


class Employee(models.Model):
    """员工模型"""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=1000, blank=True, default='', help_text='员工姓名')
    designation = models.CharField(max_length=1000, blank=True, default='', help_text='职位')

    class Meta:
        """Employee 模型的元数据配置"""
        db_table = 'employee'
        verbose_name = '员工'
        verbose_name_plural = '员工'

    def __str__(self):
        return str(self.name or f'Employee {self.id}')


class Dork(models.Model):
    """Google Dork 模型"""

    id = models.AutoField(primary_key=True)
    type = models.CharField(max_length=500, blank=True, default='', help_text='Dork 类型')
    url = models.CharField(max_length=10000, blank=True, default='', help_text='URL 地址')

    class Meta:
        """Dork 模型的元数据配置"""
        db_table = 'dork'
        verbose_name = 'Google Dork'
        verbose_name_plural = 'Google Dorks'

    def __str__(self):
        if self.type and self.url:
            return f'{self.type}: {str(self.url)[:50]}'
        return f'Dork {self.id}'


class S3Bucket(models.Model):
    """S3 存储桶模型"""

    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=500, blank=True, default='', help_text='存储桶名称')
    region = models.CharField(max_length=500, blank=True, default='', help_text='区域')
    provider = models.CharField(max_length=100, blank=True, default='', help_text='云服务提供商')
    owner_id = models.CharField(max_length=250, blank=True, default='', help_text='所有者 ID')
    owner_display_name = models.CharField(max_length=250, blank=True, default='', help_text='所有者显示名称')

    # 认证用户权限
    perm_auth_users_read = models.IntegerField(default=0, help_text='认证用户读权限')
    perm_auth_users_write = models.IntegerField(default=0, help_text='认证用户写权限')
    perm_auth_users_read_acl = models.IntegerField(default=0, help_text='认证用户读 ACL 权限')
    perm_auth_users_write_acl = models.IntegerField(default=0, help_text='认证用户写 ACL 权限')
    perm_auth_users_full_control = models.IntegerField(default=0, help_text='认证用户完全控制权限')

    # 所有用户权限
    perm_all_users_read = models.IntegerField(default=0, help_text='所有用户读权限')
    perm_all_users_write = models.IntegerField(default=0, help_text='所有用户写权限')
    perm_all_users_read_acl = models.IntegerField(default=0, help_text='所有用户读 ACL 权限')
    perm_all_users_write_acl = models.IntegerField(default=0, help_text='所有用户写 ACL 权限')
    perm_all_users_full_control = models.IntegerField(default=0, help_text='所有用户完全控制权限')

    # 统计信息
    num_objects = models.IntegerField(default=0, help_text='对象数量')
    size = models.IntegerField(default=0, help_text='存储桶大小（字节）')

    class Meta:
        """S3Bucket 模型的元数据配置"""
        db_table = 's3_bucket'
        verbose_name = 'S3 存储桶'
        verbose_name_plural = 'S3 存储桶'

    def __str__(self):
        return str(self.name or f'S3Bucket {self.id}')