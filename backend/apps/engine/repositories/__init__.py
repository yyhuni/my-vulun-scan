"""
Engine Repositories 模块

提供 ScanEngine 数据访问层接口和实现
"""

# 接口定义（Protocol）
from .engine_repository import EngineRepositoryInterface

# Django ORM 实现
from .django_engine_repository import DjangoEngineRepository

__all__ = [
    'EngineRepositoryInterface',
    'DjangoEngineRepository',
]
