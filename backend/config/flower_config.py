"""
Flower (Celery 监控工具) 配置文件
文档: https://flower.readthedocs.io/en/latest/config.html
"""

# Web 界面端口
port = 5555

# Redis Broker API
broker_api = 'redis://localhost:6379/0'

# 持久化任务历史
persistent = True

# SQLite 数据库文件路径
db = 'flower.db'

# 最大保存任务数
max_tasks = 10000

# 可选：基本认证（生产环境推荐启用）
# basic_auth = ['admin:password']

# 可选：自动刷新间隔（毫秒）
# auto_refresh = True
# refresh_interval = 5000
