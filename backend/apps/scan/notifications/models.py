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
    message = models.CharField(max_length=2000, help_text='通知内容')
    
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
    
    @classmethod
    def cleanup_old_notifications(cls):
        """
        清理超过15天的旧通知（硬编码）
        
        Returns:
            int: 删除的通知数量
        """
        from datetime import datetime, timedelta
        
        # 硬编码：只保留最近15天的通知
        cutoff_date = datetime.now() - timedelta(days=15)
        delete_result = cls.objects.filter(created_at__lt=cutoff_date).delete()
        
        return delete_result[0] if delete_result[0] else 0
    
    def save(self, *args, **kwargs):
        """
        重写save方法，在创建新通知时自动清理旧通知
        """
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # 只在创建新通知时执行清理（自动清理超过15天的通知）
        if is_new:
            try:
                deleted_count = self.__class__.cleanup_old_notifications()
                if deleted_count > 0:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"自动清理了 {deleted_count} 条超过15天的旧通知")
            except Exception as e:
                # 清理失败不应影响通知创建
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"通知自动清理失败: {e}")
