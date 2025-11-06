# 后端服务管理脚本

## 📂 目录结构优化

所有运行时文件已统一放置在 `var/` 目录下：

```
backend/
├── var/                       # 运行时数据目录
│   ├── logs/                  # 日志文件
│   │   ├── django.log
│   │   ├── celery_orchestrator.log
│   │   ├── celery_scans.log
│   │   ├── celery_beat.log
│   │   └── flower.log
│   ├── run/                   # PID 文件
│   │   ├── django.pid
│   │   ├── celery_orchestrator.pid
│   │   ├── celery_scans.pid
│   │   ├── celery_beat.pid
│   │   └── flower.pid
│   └── db/                    # 运行时数据库
│       ├── celerybeat-schedule*
│       └── flower.db
├── script/                    # 管理脚本
│   ├── start.sh              # 启动所有服务
│   ├── stop.sh               # 停止所有服务
│   ├── status.sh             # 查看服务状态
│   └── clean.sh              # 清理旧文件
├── apps/                      # 应用代码
└── config/                    # 配置文件
```

## 🚀 使用方法

### 首次使用

```bash
cd ~/Desktop/scanner/backend/script

# 1. 添加执行权限
chmod +x start.sh stop.sh status.sh clean.sh

# 2. 清理旧的运行时文件（如果有）
./clean.sh

# 3. 启动 Redis
cd ~/Desktop/scanner/docker/infrastructure
docker-compose up -d redis
```

### 启动服务

```bash
cd ~/Desktop/scanner/backend/script
./start.sh
```

### 查看状态

```bash
./status.sh
```

### 停止服务

```bash
./stop.sh
```

### 清理文件

```bash
# 清理旧的运行时文件和 Python 缓存
./clean.sh
```

## 📋 服务说明

启动的服务包括：

1. **Django 开发服务器** (端口 8888)
2. **Celery Worker - orchestrator** (并发 4)
3. **Celery Worker - scans** (并发 2)
4. **Celery Beat** (定时任务调度器)
5. **Flower** (端口 5555)

## 🌐 访问地址

- Django API: http://localhost:8888
- API 文档: http://localhost:8888/swagger/
- Flower 监控: http://localhost:5555

## 📝 查看日志

```bash
# 实时查看日志
tail -f ../var/logs/django.log
tail -f ../var/logs/celery_orchestrator.log
tail -f ../var/logs/celery_scans.log
tail -f ../var/logs/celery_beat.log
tail -f ../var/logs/flower.log
```

## ⚠️ 注意事项

- `var/` 目录下的文件已添加到 `.gitignore`，不会被提交到 Git
- Redis 必须先启动，否则后端服务无法启动
- 确保端口 6379、8888、5555 未被占用
