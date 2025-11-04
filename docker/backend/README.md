# 后端服务 Docker 配置

## 📦 服务架构

本配置文件定义了完整的后端服务栈，包括：

```
┌─────────────────────────────────────────────────┐
│              后端服务架构                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐      ┌─────────────────────┐    │
│  │  Django  │      │   Celery Workers     │    │
│  │   API    │      ├─────────────────────┤    │
│  │  :8000   │      │  orchestrator (×50)  │    │
│  └──────────┘      │  scans (×10)         │    │
│       │            │  beat (定时器)        │    │
│       │            └─────────────────────┘    │
│       │                     │                  │
│       └─────────┬───────────┘                  │
│                 │                              │
│         ┌───────▼────────┐                     │
│         │  Redis (Broker) │                     │
│         └────────────────┘                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🚀 快速启动

### 1. 启动基础设施服务（Redis）

```bash
cd docker/infrastructure
docker-compose up -d
```

### 2. 启动后端服务

```bash
cd docker/backend
docker-compose up -d
```

### 3. 查看服务状态

```bash
docker-compose ps
```

### 4. 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f celery-orchestrator
docker-compose logs -f celery-scans
```

## 📊 队列架构说明

### Orchestrator 队列（编排任务）

- **特点**：轻量级、CPU 密集型、执行快（<1秒）
- **并发**：50 个进程
- **任务类型**：
  - `initiate_scan`：扫描任务初始化

### Scans 队列（扫描任务）

- **特点**：重量级、IO 密集型、执行慢（1-10分钟）
- **并发**：10 个进程（限制资源占用）
- **任务类型**：
  - `subdomain_discovery`：子域名发现
  - 未来：`port_scan`、`vulnerability_scan` 等

## 🔧 配置调优

### 调整 Worker 并发数

编辑 `docker-compose.yml`：

```yaml
# 编排任务 worker
celery-orchestrator:
  command: >
    celery -A config worker
    -Q orchestrator
    -c 100  # ← 调整并发数（推荐：CPU 核心数 × 10-20）
    ...

# 扫描任务 worker
celery-scans:
  command: >
    celery -A config worker
    -Q scans
    -c 5  # ← 调整并发数（推荐：CPU 核心数 × 1-2）
    ...
```

### 调整资源限制

```yaml
celery-scans:
  deploy:
    resources:
      limits:
        cpus: '8'      # ← 调整 CPU 限制
        memory: 16G    # ← 调整内存限制
```

## 📝 环境变量配置

创建 `.env` 文件：

```bash
# Django 配置
DEBUG=False
SECRET_KEY=your-secret-key-here
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com

# 数据库配置
DB_NAME=xingrin
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=postgres
DB_PORT=5432

# Celery 配置
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
```

## 🔍 监控和管理

### 查看 Celery 任务队列

```bash
# 进入容器
docker exec -it vulun-celery-orchestrator bash

# 查看活动任务
celery -A config inspect active

# 查看已注册任务
celery -A config inspect registered

# 查看队列状态
celery -A config inspect stats
```

### Flower 监控（可选）

在 `docker-compose.yml` 中添加：

```yaml
celery-flower:
  build:
    context: ../../backend
    dockerfile: ../docker/backend/Dockerfile
  command: celery -A config flower --port=5555
  ports:
    - "5555:5555"
  environment:
    - CELERY_BROKER_URL=redis://redis:6379/0
  depends_on:
    - redis
  networks:
    - vulun-network
```

访问：http://localhost:5555

## 🐛 故障排查

### 任务不执行

1. 检查 Redis 连接：
```bash
docker exec -it vulun-redis redis-cli ping
```

2. 检查 worker 是否运行：
```bash
docker-compose ps
```

3. 检查任务路由配置：
```bash
docker exec -it vulun-backend python manage.py shell
>>> from config.celery import app
>>> print(app.conf.task_routes)
```

### Worker 内存占用过高

1. 减少并发数（`-c` 参数）
2. 启用自动重启：
```yaml
command: >
  celery -A config worker
  -Q scans
  -c 10
  --max-tasks-per-child 100  # ← 每处理 100 个任务后重启进程
```

### 任务超时

调整 `backend/config/celery.py`：

```python
app.conf.task_time_limit = 7200  # 2小时
app.conf.task_soft_time_limit = 6600  # 1小时50分钟
```

## 📚 相关文档

- [Celery 官方文档](https://docs.celeryproject.org/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Django 官方文档](https://docs.djangoproject.com/)

