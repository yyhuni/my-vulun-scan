from django.db import models


class ScanStatus(models.TextChoices):
    """扫描任务状态枚举（与 Prefect 状态对齐）"""
    CANCELLED = 'cancelled', '已取消'
    COMPLETED = 'completed', '已完成'
    CRASHED = 'crashed', '崩溃'
    FAILED = 'failed', '失败'
    INITIATED = 'initiated', '初始化'
    RUNNING = 'running', '运行中'
