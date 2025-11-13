"""通知系统数据模型"""

from django.db import models

from .types import NotificationLevel

"""
通知系统数据模型
"""
class Notification(models.Model):
    """通知模型"""
    
    id = models.AutoField(primary_key=True)
    
    
    # 通知基本信息
    level = models.CharField(
        max_length=20,
        choices=NotificationLevel.choices,
        default=NotificationLevel.LOW,
        db_index=True,
        help_text='通知级别'
    )
    
    title = models.CharField(max_length=200, help_text='通知标题')
    message = models.TextField(help_text='通知内容')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, help_text='创建时间')
    
    is_read = models.BooleanField(default=False, help_text='是否已读')
    read_at = models.DateTimeField(null=True, blank=True, help_text='阅读时间')
    
    class Meta:
        db_table = 'notification'
        verbose_name = '通知'
        verbose_name_plural = '通知'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['level', '-created_at']),
            models.Index(fields=['is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_level_display()} - {self.title}"
