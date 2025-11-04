from django.db import models


class ScanTaskStatus(models.IntegerChoices):
    """扫描任务状态枚举"""
    ABORTED = -2, '中止'
    FAILED = -1, '失败'
    INITIATED = 0, '初始化'
    RUNNING = 1, '运行中'
    SUCCESSFUL = 2, '成功'
