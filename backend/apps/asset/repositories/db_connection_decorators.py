"""
数据库连接装饰器

提供自动数据库连接健康检查的装饰器，确保长时间运行的任务中数据库连接不会失效。

主要功能：
- @auto_ensure_db_connection: 类装饰器，自动为所有公共方法添加连接检查
- @ensure_db_connection: 方法装饰器，单独为某个方法添加连接检查
"""

import logging
import functools
from django.db import connection

logger = logging.getLogger(__name__)


def ensure_db_connection(method):
    """
    方法装饰器：自动确保数据库连接健康
    
    在 Repository 方法执行前自动检查数据库连接，如果连接失效则自动重连。
    
    使用场景：
    - 需要单独装饰某个方法时使用
    - 通常建议使用类装饰器 @auto_ensure_db_connection
    
    示例：
        @ensure_db_connection
        def my_method(self):
            # 会自动检查连接健康
            ...
    """
    @functools.wraps(method)
    def wrapper(self, *args, **kwargs):
        _check_and_reconnect()
        return method(self, *args, **kwargs)
    return wrapper


def auto_ensure_db_connection(cls):
    """
    类装饰器：自动给所有公共方法添加数据库连接检查
    
    自动为类中所有公共方法（不以 _ 开头的方法）添加 @ensure_db_connection 装饰器。
    
    特性：
    - 自动装饰所有公共方法
    - 跳过私有方法（以 _ 开头）
    - 跳过类方法和静态方法
    - 跳过已经装饰过的方法
    
    使用方式：
        @auto_ensure_db_connection
        class MyRepository:
            def bulk_create(self, items):
                # 自动添加连接检查
                ...
            
            def query(self, filters):
                # 自动添加连接检查
                ...
            
            def _private_method(self):
                # 不会添加装饰器
                ...
    
    优势：
    - 无需为每个方法手动添加装饰器
    - 减少代码重复
    - 降低遗漏风险
    """
    for attr_name in dir(cls):
        # 跳过私有方法和魔术方法
        if attr_name.startswith('_'):
            continue
        
        attr = getattr(cls, attr_name)
        
        # 只装饰可调用的实例方法
        if callable(attr) and not isinstance(attr, (staticmethod, classmethod)):
            # 检查是否已经被装饰过（避免重复装饰）
            if not hasattr(attr, '_db_connection_ensured'):
                wrapped = ensure_db_connection(attr)
                wrapped._db_connection_ensured = True
                setattr(cls, attr_name, wrapped)
    
    return cls


def _check_and_reconnect():
    """
    检查数据库连接健康状态，必要时重新连接
    
    策略：
    1. 尝试执行简单查询测试连接
    2. 如果失败，关闭当前连接并重新建立
    
    异常处理：
    - 连接失效时自动重连
    - 记录警告日志
    - 忽略关闭连接时的错误
    """
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception as e:
        logger.warning("数据库连接检查失败，重新建立连接: %s", str(e))
        try:
            connection.close()
        except Exception:
            pass  # 忽略关闭时的错误
        connection.ensure_connection()


