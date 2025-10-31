
from django.db import models


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
        null=True,
        blank=True,
        help_text='所属的扫描目标'
    )
    name = models.CharField(max_length=1000, help_text='子域名名称')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')


    cname = models.CharField(max_length=5000, blank=True, default='', help_text="CNAME记录（多个用逗号分隔），由httpx探测获取")
    is_cdn = models.BooleanField(default=False, blank=True, null=True, help_text="是否使用CDN（由httpx的cdn探测标志判断）")
    cdn_name = models.CharField(max_length=200, blank=True, default='', help_text="CDN提供商名称（如cloudflare, akamai等）")


    class Meta:
        db_table = 'subdomain'
        verbose_name = '子域名'
        verbose_name_plural = '子域名'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]
    def __str__(self):
        return str(self.name or f'Subdomain {self.id}')

    

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

    url = models.CharField(max_length=1000, help_text='站点url')
    screenshot_path = models.CharField(max_length=1000, blank=True,default='', help_text='截图路径')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    title = models.CharField(max_length=1000, blank=True, default='', help_text='页面标题')
    status_code = models.IntegerField(default=0, help_text='HTTP状态码')
    content_length = models.IntegerField(default=0, help_text='内容长度（字节）')
    response_time = models.IntegerField(default=0, help_text='响应时间（毫秒）')
    content_type = models.CharField(max_length=200, blank=True, default='', help_text='HTTP响应的Content-Type（如text/html, application/json等）')
    webserver = models.CharField(max_length=200, blank=True, default='', help_text='Web服务器（如nginx, apache等）')
    technologies = models.ManyToManyField(
        'Technology',
        related_name='websites',
        blank=True,
        help_text='所属的站点技术'
    )

    class Meta:
        db_table = 'website'
        verbose_name = '站点'
        verbose_name_plural = '站点'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
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
    """IP地址模型"""
    id = models.AutoField(primary_key=True)
    ip = models.CharField(max_length=500, blank=True, default='', help_text='IP地址')
    protocol_version = models.CharField(max_length=500, blank=True, default='', help_text='协议版本（如IPv4, IPv6）')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
    is_private = models.BooleanField(default=False, help_text='是否私有IP')
    reverse_pointer = models.CharField(max_length=500, blank=True, default='', help_text='反向解析（如域名）')

    class Meta:
        db_table = 'ip_address'
        verbose_name = 'IP地址'
        verbose_name_plural = 'IP地址'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]
    def __str__(self):
        return str(self.ip or f'IPAddress {self.id}')


class Port(models.Model):
    """端口模型"""
    id = models.AutoField(primary_key=True)
    ip = models.ForeignKey(
        'IPAddress',
        on_delete=models.CASCADE,
        related_name='ports',
        null=True,
        blank=True,
        help_text='所属的IP地址'
    )
    number = models.IntegerField(default=0, help_text='端口号')
    description = models.CharField(max_length=500, blank=True, default='', help_text='端口描述（如http, https, ssh, ftp等）')
    service_name = models.CharField(max_length=500, blank=True, default='', help_text='服务名称（如http, https, ssh, ftp等）')
    is_uncommon = models.BooleanField(default=False, help_text='是否为不常见端口')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')


    class Meta:
        db_table = 'port'
        verbose_name = '端口'
        verbose_name_plural = '端口'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return str(self.number or f'Port {self.id}')


class DirectoryScan(models.Model):
    """目录扫描模型"""
    id = models.AutoField(primary_key=True)
    ffuf_command = models.CharField(max_length=500, blank=True, default='', help_text='ffuf命令')
    start_scan_at = models.DateTimeField(null=True, help_text='开始扫描时间')
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
    length = models.IntegerField(default=0)
    lines = models.IntegerField(default=0)
    http_status = models.IntegerField(default=0)
    words = models.IntegerField(default=0)
    name = models.CharField(max_length=500, blank=True, default='', help_text='路径名称')
    url = models.CharField(max_length=5000, blank=True, default='', help_text='URL地址')
    content_type = models.CharField(max_length=100, blank=True, default='', help_text='内容类型')
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