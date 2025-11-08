"""
配置包初始化

确保 Prefect 配置在 Django 启动时被加载
"""

# 导入 Prefect 配置，确保在 Django 启动时加载
from .prefect import configure_prefect

# 配置 Prefect
configure_prefect()

__all__ = ('configure_prefect',)

