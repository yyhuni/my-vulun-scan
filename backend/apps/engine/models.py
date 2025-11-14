from django.db import models


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
