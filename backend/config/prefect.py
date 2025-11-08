"""
Prefect 配置模块

负责 Prefect 应用初始化和工作流配置
"""

import os
from django.conf import settings


def get_prefect_settings():
    """
    获取 Prefect 配置
    
    Returns:
        dict: Prefect 配置字典
    """
    return {
        # Prefect API 设置
        'PREFECT_API_URL': os.getenv('PREFECT_API_URL', 'http://localhost:4200/api'),
        
        # Prefect Server 数据库配置（使用 Django 的 PostgreSQL）
        'PREFECT_API_DATABASE_CONNECTION_URL': os.getenv(
            'PREFECT_API_DATABASE_CONNECTION_URL',
            f"postgresql+asyncpg://{settings.DATABASES['default']['USER']}:"
            f"{settings.DATABASES['default']['PASSWORD']}@"
            f"{settings.DATABASES['default']['HOST']}:"
            f"{settings.DATABASES['default']['PORT']}/"
            f"prefect"  # 使用独立的 prefect 数据库
        ),
        
        # 工作池配置
        'PREFECT_DEFAULT_WORK_POOL_NAME': os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'default'),
        
        # 日志级别
        'PREFECT_LOGGING_LEVEL': os.getenv('PREFECT_LOGGING_LEVEL', 'INFO'),
        
        # 任务超时配置
        'PREFECT_TASK_DEFAULT_TIMEOUT_SECONDS': int(os.getenv('PREFECT_TASK_DEFAULT_TIMEOUT_SECONDS', '3600')),
        
        # 重试配置
        'PREFECT_TASK_DEFAULT_RETRIES': int(os.getenv('PREFECT_TASK_DEFAULT_RETRIES', '3')),
        'PREFECT_TASK_DEFAULT_RETRY_DELAY_SECONDS': int(os.getenv('PREFECT_TASK_DEFAULT_RETRY_DELAY_SECONDS', '60')),
    }


def configure_prefect():
    """
    配置 Prefect 环境变量
    
    在 Django 应用启动时调用，设置 Prefect 相关的环境变量
    """
    prefect_settings = get_prefect_settings()
    
    # 设置环境变量
    for key, value in prefect_settings.items():
        if key.startswith('PREFECT_'):
            os.environ.setdefault(key, str(value))


# Django 启动时自动配置
configure_prefect()

