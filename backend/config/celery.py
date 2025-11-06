"""
Celery 配置模块

负责 Celery 应用初始化和任务路由配置
"""

import os
from celery import Celery

# 设置 Django settings 模块
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# 创建 Celery 应用实例
app = Celery('scanner')

# 从 Django settings 加载配置（以 CELERY_ 为前缀）
app.config_from_object('django.conf:settings', namespace='CELERY')

# 自动发现所有已安装 app 下的 tasks.py
app.autodiscover_tasks()


# ==================== 队列路由配置 ====================
# 将不同类型任务路由到不同队列，实现资源隔离和独立扩展

app.conf.task_routes = {
    # 编排任务 -> orchestrator 队列（轻量级、高并发）
    'initiate_scan': {
        'queue': 'orchestrator',
        'routing_key': 'orchestrator.initiate_scan',
    },
    
    # 收尾任务 -> orchestrator 队列
    'finalize_scan': {
        'queue': 'orchestrator',
        'routing_key': 'orchestrator.finalize_scan',
    },
    
    # 维护任务 -> orchestrator 队列（定时清理）
    'cleanup_old_scans': {
        'queue': 'orchestrator',
        'routing_key': 'orchestrator.cleanup_old_scans',
    },
    
    # 扫描任务 -> scans 队列（重量级、限制并发）
    'subdomain_discovery': {
        'queue': 'scans',
        'routing_key': 'scans.subdomain_discovery',
    },
    
    # 未来可扩展其他队列：
    # 'port_scan': {
    #     'queue': 'scans',
    #     'routing_key': 'scans.port_scan',
    # },
    # 'vulnerability_scan': {
    #     'queue': 'scan_heavy',
    #     'routing_key': 'scan_heavy.vulnerability_scan',
    # },
}


# ==================== 队列优先级配置 ====================
# 定义队列优先级，确保编排任务优先执行

app.conf.task_queue_max_priority = 10
app.conf.task_default_priority = 5


# ==================== 超时配置 ====================
# 不同队列任务的超时策略

app.conf.task_time_limit = 3600  # 硬超时：1小时（强制终止）
app.conf.task_soft_time_limit = 3000  # 软超时：50分钟（抛出异常，允许清理）


# ==================== Worker 预取配置 ====================
# 控制 worker 预取任务数量，避免任务堆积

app.conf.worker_prefetch_multiplier = 1  # 每个 worker 只预取 1 个任务


# ==================== 结果后端配置 ====================
# 任务结果存储（可选，默认不存储）

# app.conf.result_backend = 'redis://localhost:6379/0'
# app.conf.result_expires = 3600  # 结果过期时间：1小时


# ==================== Celery Beat 定时任务配置 ====================
# 配置定期执行的任务

from celery.schedules import crontab

app.conf.beat_schedule = {
    # 每天凌晨 2 点执行清理任务
    'cleanup-old-scans-daily': {
        'task': 'cleanup_old_scans',
        'schedule': crontab(hour=2, minute=0),  # 每天凌晨 2:00
        'options': {
            'queue': 'orchestrator',
            'expires': 3600,  # 任务过期时间：1小时
        },
    },
}


# ==================== 调试配置 ====================

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """调试任务，用于测试 Celery 配置"""
    print(f'Request: {self.request!r}')

