"""
Prefect 配置模块

负责 Prefect 应用初始化和工作流配置
"""

import os
from django.conf import settings


def configure_prefect():
    """
    将 Django settings 中的 Prefect 配置写入环境变量
    
    在 Django 应用启动时调用，将 settings.py 中的配置写入环境变量，
    供 Prefect 库使用。使用 setdefault 避免覆盖已存在的环境变量。
    
    数据流：
    .env → settings.py（Django 代码使用）→ 环境变量（Prefect 库使用）
    """
    # Prefect API 设置
    os.environ.setdefault('PREFECT_API_URL', settings.PREFECT_API_URL)
    
    # Prefect Server 数据库配置（使用 Django 的 PostgreSQL）
    os.environ.setdefault(
        'PREFECT_API_DATABASE_CONNECTION_URL',
        f"postgresql+asyncpg://{settings.DATABASES['default']['USER']}:"
        f"{settings.DATABASES['default']['PASSWORD']}@"
        f"{settings.DATABASES['default']['HOST']}:"
        f"{settings.DATABASES['default']['PORT']}/"
        f"{settings.PREFECT_DATABASE_NAME}"
    )
    
    # 工作池配置
    os.environ.setdefault('PREFECT_DEFAULT_WORK_POOL_NAME', settings.PREFECT_DEFAULT_WORK_POOL_NAME)
    
    # 日志级别
    os.environ.setdefault('PREFECT_LOGGING_LEVEL', settings.PREFECT_LOGGING_LEVEL)
    
    # 任务超时配置
    os.environ.setdefault('PREFECT_TASK_DEFAULT_TIMEOUT_SECONDS', str(settings.PREFECT_TASK_DEFAULT_TIMEOUT_SECONDS))
    
    # 重试配置
    os.environ.setdefault('PREFECT_TASK_DEFAULT_RETRIES', str(settings.PREFECT_TASK_DEFAULT_RETRIES))
    os.environ.setdefault('PREFECT_TASK_DEFAULT_RETRY_DELAY_SECONDS', str(settings.PREFECT_TASK_DEFAULT_RETRY_DELAY_SECONDS))


# Django 启动时自动配置
configure_prefect()

