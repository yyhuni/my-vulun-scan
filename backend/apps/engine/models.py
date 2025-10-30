from django.db import models


class ScanEngine(models.Model):
    """扫描引擎模型"""
    
    id = models.AutoField(primary_key=True)
    
    name = models.CharField(
        max_length=200,
        unique=True,
        help_text='引擎名称'
    )
    
    configuration = models.TextField(
        blank=True,
        help_text='引擎配置，yaml 格式'
    )
    
    is_default = models.BooleanField(
        default=False,
        help_text='是否为默认引擎'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='创建时间'
    )
    
    
    class Meta:
        db_table = 'scan_engine'
        verbose_name = '扫描引擎'
        verbose_name_plural = verbose_name
        ordering = ['name']
    
    def __str__(self):
        return self.name