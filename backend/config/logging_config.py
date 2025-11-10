"""
日志配置模块

根据环境（开发/生产）和环境变量配置 Django 日志系统

环境变量：
- LOG_LEVEL: 全局日志级别 (DEBUG/INFO/WARNING/ERROR/CRITICAL)
- LOG_DIR: 日志文件目录（留空则不输出文件）
- SCAN_LOG_LEVEL: 扫描模块日志级别（可选）

开发环境特性：
- 默认 DEBUG 级别
- 控制台彩色输出
- 可选文件输出

生产环境特性：
- 默认 INFO 级别
- 控制台 + 文件输出（配置 LOG_DIR）
- 文件自动轮转（10MB，保留5个备份）
"""

import os
from pathlib import Path


def get_logging_config(debug: bool = False):
    """
    获取日志配置字典
    
    Args:
        debug: 是否为 DEBUG 模式
    
    Returns:
        dict: Django LOGGING 配置字典
    """
    # 获取日志配置
    log_level = os.getenv('LOG_LEVEL', 'DEBUG' if debug else 'INFO')
    log_dir = os.getenv('LOG_DIR', '')
    
    # 模块级别日志控制（可选）
    scan_log_level = os.getenv('SCAN_LOG_LEVEL', log_level)
    
    # 构建 handlers 配置
    log_handlers = ['console']
    logging_handlers = {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'colored' if debug else 'standard',
            'stream': 'ext://sys.stdout',
        }
    }
    
    # 如果配置了日志目录，添加文件 handler
    if log_dir:
        log_path = Path(log_dir)
        log_path.mkdir(parents=True, exist_ok=True)
        
        log_handlers.append('file')
        logging_handlers['file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': 'standard',
            'filename': str(log_path / 'xingrin.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'encoding': 'utf-8',
        }
        
        # 错误日志单独记录
        log_handlers.append('error_file')
        logging_handlers['error_file'] = {
            'class': 'logging.handlers.RotatingFileHandler',
            'formatter': 'standard',
            'filename': str(log_path / 'xingrin_error.log'),
            'maxBytes': 10 * 1024 * 1024,  # 10MB
            'backupCount': 5,
            'encoding': 'utf-8',
            'level': 'ERROR',  # 只记录 ERROR 及以上级别
        }
    
    # 构建完整的 LOGGING 配置
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        
        # 格式化器
        'formatters': {
            'standard': {
                'format': '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
            'colored': {
                'format': '%(log_color)s[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d]%(reset)s %(message)s',
                'datefmt': '%Y-%m-%d %H:%M:%S',
                '()': 'colorlog.ColoredFormatter',
                'log_colors': {
                    'DEBUG': 'cyan',
                    'INFO': 'green',
                    'WARNING': 'yellow',
                    'ERROR': 'red',
                    'CRITICAL': 'red,bg_white',
                },
            },
        },
        
        # 处理器
        'handlers': logging_handlers,
        
        # 日志记录器
        'loggers': {
            # Django 核心日志
            'django': {
                'handlers': log_handlers,
                'level': 'INFO',  # Django 框架日志，通常不需要 DEBUG
                'propagate': False,
            },
            'django.request': {
                'handlers': log_handlers,
                'level': 'WARNING',  # 请求错误日志
                'propagate': False,
            },
            'django.db.backends': {
                'handlers': log_handlers,
                'level': 'WARNING' if not debug else 'DEBUG',  # SQL 查询日志（开发环境可启用）
                'propagate': False,
            },
            

            
            # 应用日志 - 扫描模块
            'apps.scan': {
                'handlers': log_handlers,
                'level': scan_log_level,
                'propagate': False,
            },
            
            # 应用日志 - 其他模块（统一级别）
            'apps.asset': {
                'handlers': log_handlers,
                'level': log_level,
                'propagate': False,
            },
            'apps.targets': {
                'handlers': log_handlers,
                'level': log_level,
                'propagate': False,
            },
            'apps.engine': {
                'handlers': log_handlers,
                'level': log_level,
                'propagate': False,
            },
            'apps.common': {
                'handlers': log_handlers,
                'level': log_level,
                'propagate': False,
            },
        },
        
        # 根日志记录器（兜底配置）
        'root': {
            'level': log_level,
            'handlers': log_handlers,
        },
    }
    
    return logging_config
