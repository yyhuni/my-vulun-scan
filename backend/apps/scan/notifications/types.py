"""通知系统类型定义"""

from django.db import models




class NotificationLevel(models.TextChoices):
    """通知级别"""
    LOW = 'low', '低'
    MEDIUM = 'medium', '中'
    HIGH = 'high', '高'
