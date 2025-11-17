"""
Scan Repositories 模块

只提供 Scan 模型的数据访问层接口和实现
其他模型的 Repository 应从各自的 app 导入
"""

# 接口定义（Protocol）
from .scan_repository_interface import ScanRepositoryInterface

# Django ORM 实现
from .django_scan_repository import DjangoScanRepository

# 为了向后兼容，保留 ScanRepository 别名
ScanRepository = DjangoScanRepository

__all__ = [
    # 接口
    'ScanRepositoryInterface',
    # 实现类
    'DjangoScanRepository',
    # 向后兼容别名
    'ScanRepository',
]

