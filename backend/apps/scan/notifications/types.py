"""通知系统类型定义"""

from django.db import models




class NotificationLevel(models.TextChoices):
    """通知级别"""
    INFO = 'info', '信息'
    WARNING = 'warning', '警告'
    IMPORTANT = 'important', '重要'
