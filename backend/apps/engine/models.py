from django.db import models


class WorkerNode(models.Model):
    """Worker 节点模型 - 分布式扫描执行器"""
    
    name = models.CharField(max_length=100, help_text='节点名称')
    ip_address = models.GenericIPAddressField(help_text='VPS 公网 IP')
    ssh_port = models.IntegerField(default=22, help_text='SSH 端口')
    username = models.CharField(max_length=50, default='root', help_text='SSH 用户名')
    password = models.CharField(max_length=200, blank=True, default='', help_text='SSH 密码')
    
    # 心跳监控字段 (状态完全由 last_seen 决定)
    last_seen = models.DateTimeField(null=True, blank=True, help_text='最后心跳时间')
    info = models.JSONField(default=dict, blank=True, help_text='系统信息(CPU/内存/磁盘)')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'worker_node'
        verbose_name = 'Worker 节点'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.ip_address})"


class ScanEngine(models.Model):
    """扫描引擎模型"""
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, unique=True, help_text='引擎名称')
    configuration = models.CharField(max_length=10000, blank=True, default='', help_text='引擎配置，yaml 格式')
    is_default = models.BooleanField(default=False, help_text='是否为默认引擎')
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')

    class Meta:
        db_table = 'scan_engine'
        verbose_name = '扫描引擎'
        verbose_name_plural = '扫描引擎'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_default']),  # 优化默认引擎查询
        ]
        constraints = [
            # PostgreSQL 部分唯一索引：确保最多只有一个 is_default=True 的记录
            models.UniqueConstraint(
                fields=['is_default'],
                condition=models.Q(is_default=True),
                name='unique_default_scan_engine'
            )
        ]
    def __str__(self):
        return str(self.name or f'ScanEngine {self.id}')


class SystemConfig(models.Model):
    """系统配置模型 - Key-Value 存储"""
    
    key = models.CharField(max_length=100, unique=True, primary_key=True, help_text='配置键')
    value = models.CharField(max_length=500, blank=True, default='', help_text='配置值')
    description = models.CharField(max_length=200, blank=True, default='', help_text='配置说明')
    updated_at = models.DateTimeField(auto_now=True, help_text='更新时间')

    class Meta:
        db_table = 'system_config'
        verbose_name = '系统配置'
        verbose_name_plural = '系统配置'

    def __str__(self):
        return f"{self.key}: {self.value}"
    
    @classmethod
    def get_value(cls, key: str, default: str = '') -> str:
        """获取配置值"""
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default
    
    @classmethod
    def set_value(cls, key: str, value: str, description: str = '') -> 'SystemConfig':
        """设置配置值"""
        config, _ = cls.objects.update_or_create(
            key=key,
            defaults={'value': value, 'description': description}
        )
        return config
