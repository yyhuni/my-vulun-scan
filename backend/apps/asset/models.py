"""
Asset 应用的数据库模型定义

此模块包含了资产管理相关的所有 Django 模型类：
- Email: 邮箱模型
- Employee: 员工模型
- Dork: Google Dork 模型
- S3Bucket: S3 存储桶模型
"""

from django.db import models


class Email(models.Model):
    """邮箱模型"""

    id = models.AutoField(primary_key=True)

    address = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text='邮箱地址'
    )

    password = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text='邮箱密码'
    )

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

    name = models.CharField(
        max_length=1000,
        null=True,
        blank=True,
        help_text='员工姓名'
    )

    designation = models.CharField(
        max_length=1000,
        null=True,
        blank=True,
        help_text='职位'
    )

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

    type = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Dork 类型'
    )

    url = models.CharField(
        max_length=10000,
        null=True,
        blank=True,
        help_text='URL 地址'
    )

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

    name = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='存储桶名称'
    )

    region = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='区域'
    )

    provider = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text='云服务提供商'
    )

    owner_id = models.CharField(
        max_length=250,
        null=True,
        blank=True,
        help_text='所有者 ID'
    )

    owner_display_name = models.CharField(
        max_length=250,
        null=True,
        blank=True,
        help_text='所有者显示名称'
    )

    # 认证用户权限
    perm_auth_users_read = models.IntegerField(
        default=0,
        help_text='认证用户读权限'
    )

    perm_auth_users_write = models.IntegerField(
        default=0,
        help_text='认证用户写权限'
    )

    perm_auth_users_read_acl = models.IntegerField(
        default=0,
        help_text='认证用户读 ACL 权限'
    )

    perm_auth_users_write_acl = models.IntegerField(
        default=0,
        help_text='认证用户写 ACL 权限'
    )

    perm_auth_users_full_control = models.IntegerField(
        default=0,
        help_text='认证用户完全控制权限'
    )

    # 所有用户权限
    perm_all_users_read = models.IntegerField(
        default=0,
        help_text='所有用户读权限'
    )

    perm_all_users_write = models.IntegerField(
        default=0,
        help_text='所有用户写权限'
    )

    perm_all_users_read_acl = models.IntegerField(
        default=0,
        help_text='所有用户读 ACL 权限'
    )

    perm_all_users_write_acl = models.IntegerField(
        default=0,
        help_text='所有用户写 ACL 权限'
    )

    perm_all_users_full_control = models.IntegerField(
        default=0,
        help_text='所有用户完全控制权限'
    )

    # 统计信息
    num_objects = models.IntegerField(
        default=0,
        help_text='对象数量'
    )

    size = models.IntegerField(
        default=0,
        help_text='存储桶大小（字节）'
    )

    class Meta:
        """S3Bucket 模型的元数据配置"""
        db_table = 's3_bucket'
        verbose_name = 'S3 存储桶'
        verbose_name_plural = 'S3 存储桶'

    def __str__(self):
        return str(self.name or f'S3Bucket {self.id}')