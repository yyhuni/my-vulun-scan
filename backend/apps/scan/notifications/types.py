"""通知系统类型定义"""

from django.db import models


class NotificationType(models.TextChoices):
    """通知类型枚举"""
    SCAN_STARTED = 'scan_started', '扫描开始'
    SCAN_PROGRESS = 'scan_progress', '扫描进度'
    SCAN_COMPLETED = 'scan_completed', '扫描完成'
    SCAN_FAILED = 'scan_failed', '扫描失败'
    SCAN_CANCELLED = 'scan_cancelled', '扫描取消'
    SCAN_CRASHED = 'scan_crashed', '扫描崩溃'


class NotificationLevel(models.TextChoices):
    """通知级别"""
    INFO = 'info', '信息'
    SUCCESS = 'success', '成功'
    WARNING = 'warning', '警告'
    ERROR = 'error', '错误'
    CRITICAL = 'critical', '严重'
