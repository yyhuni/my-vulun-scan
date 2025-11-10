# 开发环境管理脚本

快速启动、停止、重启 XingRin 开发环境的工具脚本。

## 脚本列表

| 脚本 | 功能 | 说明 |
|-----|------|------|
| `start.sh` | 启动开发环境 | 启动所有必需服务 |
| `stop.sh` | 停止开发环境 | 停止所有服务（可选保留 Prefect Server）|
| `restart.sh` | 重启开发环境 | 先停止再启动 |
| `status.sh` | 查看服务状态 | 显示各服务运行状态和日志位置 |

## 快速开始

### 首次使用

```bash
# 1. 进入脚本目录
cd ~/Desktop/scanner/backend/script/dev

# 2. 添加执行权限
chmod +x *.sh

# 3. 启动开发环境
./start.sh
```

### 日常使用

```bash
# 启动所有服务
./start.sh

# 查看服务状态
./status.sh

# 重启服务
./restart.sh

# 停止服务
./stop.sh
```

## 服务说明

### 启动的服务

`start.sh` 会按顺序启动以下服务：

1. **Prefect Server** (端口 4200)
   - 任务编排和调度服务
   - UI: http://localhost:4200

2. **Django 开发服务器** (端口 8888)
   - 后端 API 服务
   - API: http://localhost:8888

3. **Prefect Deployments**
   - 扫描任务 Deployment（按需触发）
   - 清理任务 Deployment（定时任务）

### 运行模式

**本地开发模式**（默认，推荐）
- 修改代码立即生效
- 无需重启服务
- 适合开发调试

**Docker 模式**
- Worker 在容器中运行
- 环境隔离
- 需要构建镜像

## 目录结构

```
script/dev/
├── start.sh          # 启动脚本
├── stop.sh           # 停止脚本
├── restart.sh        # 重启脚本
├── status.sh         # 状态查看脚本
├── README.md         # 本文件
└── .pids/            # PID 和日志文件（自动生成）
    ├── prefect-server.pid
    ├── prefect-server.log
    ├── django.pid
    ├── django.log
    ├── scan-deployment.pid
    ├── scan-deployment.log
    ├── cleanup-deployment.pid
    └── cleanup-deployment.log
```

## 常见操作

### 查看日志

```bash
# 实时查看所有日志
cd script/dev
tail -f .pids/*.log

# 查看特定服务日志
tail -f .pids/django.log
tail -f .pids/scan-deployment.log
tail -f .pids/prefect-server.log
```

### 只重启某个服务

```bash
# 停止所有服务
./stop.sh

# 手动启动特定服务（参考 start.sh 中的命令）
cd ~/Desktop/scanner/backend
source ../.venv/bin/python
python manage.py runserver 8888 &
```

### 清理日志

```bash
# 停止所有服务
./stop.sh

# 删除日志文件
rm -rf .pids/
```

## 故障排查

### 服务启动失败

1. **检查端口占用**
```bash
# 检查 4200 端口（Prefect）
lsof -i :4200

# 检查 8888 端口（Django）
lsof -i :8888
```

2. **查看日志**
```bash
./status.sh  # 查看所有服务状态
tail -f .pids/<服务名>.log  # 查看具体错误
```

3. **手动清理进程**
```bash
# 查找并杀死相关进程
ps aux | grep prefect
ps aux | grep python

# 强制停止
kill -9 <PID>
```

### 数据库连接失败

```bash
# 检查数据库服务
docker ps | grep postgres

# 运行迁移
cd ~/Desktop/scanner/backend
source ../.venv/bin/activate
python manage.py migrate
```

### Prefect UI 无法访问

```bash
# 重启 Prefect Server
./stop.sh
# 回答 'y' 停止 Prefect Server
./start.sh
```

## 与其他脚本的关系

| 位置 | 用途 | 区别 |
|-----|------|------|
| `script/dev/start.sh` | **完整开发环境** | 启动所有服务（Prefect + Django + Deployments）|
| `apps/scan/deployments/start.sh` | **仅 Deployments** | 只启动扫描和清理任务 |

### 使用场景

**使用 `script/dev/start.sh`**：
- 首次启动开发环境
- 启动所有服务
- 适合新手

**使用 `apps/scan/deployments/start.sh`**：
- Prefect 和 Django 已运行
- 只需重启 Deployments
- 适合调试 Flow/Task

## 最佳实践

### 开发流程

1. **启动开发环境**
```bash
cd ~/Desktop/scanner/backend/script/dev
./start.sh
```

2. **修改代码**
   - 修改 Flow/Task：立即生效（本地模式）
   - 修改 Django 代码：自动重载

3. **测试功能**
   - 访问 Prefect UI: http://localhost:4200
   - 访问 Django API: http://localhost:8888

4. **查看日志**
```bash
./status.sh
tail -f .pids/django.log
```

5. **停止服务**
```bash
./stop.sh
# Prefect Server 可以保持运行（选择 N）
```

### 注意事项

- ✅ 优先使用脚本管理服务，避免手动启动
- ✅ 定期查看 `status.sh` 确认服务状态
- ✅ 停止服务时可以保留 Prefect Server
- ⚠️ 修改脚本后需要重新添加执行权限
- ⚠️ 不要直接编辑 `.pids/` 目录下的文件

## 下一步

- 了解 [Prefect 部署配置](../../apps/scan/deployments/README.md)
- 了解 [Docker 部署](../../../docker/README.md)
- 查看 [API 文档](http://localhost:8888/api/docs)
