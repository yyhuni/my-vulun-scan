"""
资产管理模型
包含 Organization、Domain、Subdomain 模型
"""
from django.db import models
from django.core.exceptions import ValidationError


class Organization(models.Model):
    """
    组织模型 - 用于管理多个 Domain 的分组
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
    
    # Many2Many 关系：一个组织可以有多个域名
    domains = models.ManyToManyField(
        'Domain',
        related_name='organizations',
        verbose_name='关联域名'
    )
    
    class Meta:
        db_table = 'organizations'
        verbose_name = '组织'
        verbose_name_plural = '组织'
        ordering = ['-updated_at']
    
    def __str__(self):
        return self.name


class Domain(models.Model):
    """
    域名模型 - 侦察目标的核心实体
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        null=False,
        db_index=True,
        verbose_name='域名',
        help_text='完整的域名 FQDN（如 example.com），统一小写存储'
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
    
    class Meta:
        db_table = 'domains'
        verbose_name = '域名'
        verbose_name_plural = '域名'
        ordering = ['-updated_at']
        constraints = [
            # 确保域名小写存储（使用原生 SQL）
            models.CheckConstraint(
                check=models.Q(name__exact=models.Func(models.F('name'), function='LOWER')),
                name='domain_name_lowercase'
            )
        ]
    
    def save(self, *args, **kwargs):
        """保存前将域名转为小写"""
        if self.name:
            self.name = self.name.lower()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Subdomain(models.Model):
    """
    子域名模型 - 子域名发现和特征信息存储（包括根子域名）
    """
    name = models.CharField(
        max_length=255,
        null=False,
        db_index=True,
        verbose_name='子域名',
        help_text='完整的子域名 FQDN（如 api.example.com），统一小写存储'
    )
    domain = models.ForeignKey(
        Domain,
        on_delete=models.CASCADE,
        related_name='subdomains',
        db_index=True,
        verbose_name='所属域名'
    )
    is_root = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='是否为根子域名',
        help_text='Domain 自动创建的同名子域名，受保护不允许删除'
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
        db_table = 'subdomains'
        verbose_name = '子域名'
        verbose_name_plural = '子域名'
        ordering = ['-updated_at']
        unique_together = [['domain', 'name']]  # 同一域名下不会出现重复的子域名
        constraints = [
            # 确保子域名小写存储（使用原生 SQL）
            models.CheckConstraint(
                check=models.Q(name__exact=models.Func(models.F('name'), function='LOWER')),
                name='subdomain_name_lowercase'
            )
        ]
    
    def save(self, *args, **kwargs):
        """
        保存前验证和处理
        1. 将子域名转为小写
        2. 验证子域名归属（必须以父域名结尾或与父域名相同）
        3. 禁止修改 is_root 字段（创建后不可修改）
        """
        if self.name:
            self.name = self.name.lower()
        
        # 如果是更新操作，检查不可修改的字段
        if self.pk:  # pk 存在表示是更新操作
            old_instance = Subdomain.objects.get(pk=self.pk)
            
            # 禁止修改 is_root 字段
            if old_instance.is_root != self.is_root:
                raise ValidationError(
                    f'is_root 字段创建后不可修改（当前值: {old_instance.is_root}）'
                )
        
        # 验证子域名归属
        if self.domain_id:
            domain_name = self.domain.name.lower()
            subdomain_name = self.name.lower()
            
            # 根子域名：与父域名相同
            if subdomain_name == domain_name:
                self.is_root = True
            # 普通子域名：必须以 .父域名 结尾
            elif not subdomain_name.endswith(f'.{domain_name}'):
                raise ValidationError(
                    f'子域名 {subdomain_name} 不属于域名 {domain_name}'
                )
        
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """删除前检查是否为根子域名"""
        if self.is_root:
            raise ValidationError(
                f'根子域名 {self.name} 受保护，不允许手动删除。'
                '请通过删除域名来级联删除根子域名。'
            )
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return self.name
