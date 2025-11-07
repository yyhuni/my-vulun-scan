from django.db import models


class ScanTaskStatus(models.TextChoices):
    """扫描任务状态枚举"""
    ABORTED = 'aborted', '中止'
    FAILED = 'failed', '失败'
    INITIATED = 'initiated', '初始化'
    RUNNING = 'running', '运行中'
    SUCCESSFUL = 'successful', '成功'
