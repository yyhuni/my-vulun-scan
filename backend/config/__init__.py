"""
配置包初始化

确保 Celery 应用在 Django 启动时被加载
"""

# 导入 Celery 应用实例，确保在 Django 启动时加载
from .celery import app as celery_app

__all__ = ('celery_app',)

