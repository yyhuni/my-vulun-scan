"""
资产管理模型
包含 Organization、Asset、Domain 模型
"""
from django.db import models
from django.core.exceptions import ValidationError


class Organization(models.Model):
    """
    组织模型 - 用于管理多个 Asset 的分组
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        null=False,
        verbose_name='组织名称'
    )
    description = models.CharField(
        max_length=1000,
        null=True,
        blank=True,
        verbose_name='描述信息'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name='更新时间'
    )
    
    # Many2Many 关系：一个组织可以有多个资产
    assets = models.ManyToManyField(
        'Asset',
        related_name='organizations',
        verbose_name='关联资产'
    )
    
    class Meta:
        db_table = 'organizations'
        verbose_name = '组织'
        verbose_name_plural = '组织'
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.name


class Asset(models.Model):
    """
    资产模型 - 侦察目标的核心实体（目前专门表示域名，未来可扩展到 IP）
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        null=False,
        db_index=True,
        verbose_name='资产名称',
        help_text='完整的域名 FQDN（如 example.com），统一小写存储'
    )
    description = models.CharField(
        max_length=1000,
        null=True,
        blank=True,
        verbose_name='描述信息'
    )
    type = models.CharField(
        max_length=20,
        null=False,
        db_index=True,
        default='domain',
        verbose_name='资产类型',
        help_text='资产类型：domain（域名）/ ip（IP地址）/ cidr（网段），默认为 domain'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        db_table = 'assets'
        verbose_name = '资产'
        verbose_name_plural = '资产'
        ordering = ['-updated_at']
        constraints = [
            # 确保资产名称小写存储（使用原生 SQL）
            models.CheckConstraint(
                check=models.Q(name__exact=models.Func(models.F('name'), function='LOWER')),
                name='asset_name_lowercase'
            )
        ]
    
    
    def __str__(self):
        return self.name


class Domain(models.Model):
    """
    域名模型 
    """
    name = models.CharField(
        max_length=255,
        null=False,
        db_index=True,
        verbose_name='域名',
        help_text='完整的域名 FQDN（如 api.example.com），统一小写存储'
    )
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='domains',
        db_index=True,
        verbose_name='所属资产'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        db_table = 'domains'
        verbose_name = '域名'
        verbose_name_plural = '域名'
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['name'], name='domain_name_unique'),
            # 确保域名小写存储（使用原生 SQL）
            models.CheckConstraint(
                check=models.Q(name__exact=models.Func(models.F('name'), function='LOWER')),
                name='domain_name_lowercase'
            )
        ]

    def __str__(self):
        return self.name


class Endpoint(models.Model):
    """
    Endpoint 模型 - 存储发现的 URL 信息（包括完整的 URL、HTTP 探测结果等）
    """
    url = models.CharField(
        max_length=2048,
        unique=True,
        null=False,
        verbose_name='完整URL',
        help_text='完整的 URL（包括协议、域名、路径、查询参数等，如 https://www.baidu.com/a/b?a=123）'
    )
    method = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        verbose_name='HTTP方法',
        help_text='HTTP方法(GET/POST/PUT/DELETE等)'
    )
    status_code = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='HTTP状态码',
        help_text='HTTP响应状态码'
    )
    title = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='页面标题'
    )
    content_length = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name='响应内容长度',
        help_text='响应内容长度(字节)'
    )
    domain = models.ForeignKey(
        Domain,
        on_delete=models.CASCADE,
        related_name='endpoints',
        db_index=True,
        verbose_name='所属域名'
    )
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='endpoints',
        db_index=True,
        verbose_name='所属资产',
        help_text='冗余字段，性能优化'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        db_table = 'endpoints'
        verbose_name = 'Endpoint'
        verbose_name_plural = 'Endpoints'
        ordering = ['-updated_at']
        indexes = [
            # 复合索引：优化多维度查询
            models.Index(fields=['asset', 'domain'], name='idx_url_asset_domain'),
        ]
    
    def __str__(self):
        return self.url
