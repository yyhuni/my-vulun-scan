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
        unique_together = [['asset', 'name']]  # 同一资产下不会出现重复的域名
        constraints = [
            # 确保域名小写存储（使用原生 SQL）
            models.CheckConstraint(
                check=models.Q(name__exact=models.Func(models.F('name'), function='LOWER')),
                name='domain_name_lowercase'
            )
        ]

    def __str__(self):
        return self.name
