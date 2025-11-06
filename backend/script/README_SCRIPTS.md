# XingRin 后端服务管理脚本使用说明

## 📁 脚本列表

### 🔄 `restart.sh` - 重启所有服务（推荐）

**功能：**
- 停止所有运行的服务
- 清理端口占用和残留进程
- 验证端口已释放
- 备份旧日志
- 重新启动所有服务

**使用：**
```bash
cd ~/Desktop/scanner/backend
bash script/restart.sh
```

**特点：**
- ✅ 自动清理端口占用（8888, 5555）
- ✅ 自动清理残留进程
- ✅ 备份旧日志到 `var/logs/old/` 目录
- ✅ 验证端口释放状态

---

### ▶️ `start.sh` - 启动所有服务

**功能：**
- 启动 Django 开发服务器（端口 8888）
- 启动 Celery Worker - orchestrator 队列
- 启动 Celery Worker - scans 队列
- 启动 Celery Beat（定时任务）
- 启动 Flower 监控（端口 5555）

**使用：**
```bash
bash script/start.sh
```

**前置检查：**
- ✅ 检查虚拟环境是否存在
- ✅ 检查 Redis 容器是否运行
- ✅ 检查端口 8888、5555 是否被占用

**如果端口被占用：**
```bash
# 先停止服务
bash script/stop.sh
# 再启动
bash script/start.sh
```

---

### ⏹️ `stop.sh` - 停止所有服务（增强版）

**功能：**
- 阶段 1：按 PID 文件停止已知服务
- 阶段 2：清理残留进程和端口占用

**使用：**
```bash
bash script/stop.sh
```

**清理策略：**
1. **按 PID 文件停止** - 优雅停止（SIGTERM）
2. **强制停止** - 如果进程未响应（SIGKILL）
3. **按端口清理** - 释放端口 8888、5555
4. **按进程名清理** - 清理所有相关进程
5. **清理 PID 文件** - 删除所有 `.pid` 文件

**优点：**
- ✅ 即使 PID 文件丢失也能停止进程
- ✅ 即使手动启动的进程也能清理
- ✅ 彻底释放端口占用

---

### 🔍 `check.sh` - 诊断服务状态（新增）

**功能：**
- 检查端口占用情况
- 检查进程运行状态
- 检查 PID 文件状态
- 发现僵尸 PID 文件

**使用：**
```bash
bash script/check.sh
```

**输出示例：**
```
[1/3] 端口占用情况
✅ 端口 8888 (Django)
   进程 PID: 12345
   命令: python
⚪ 端口 5555 (Flower) - 未占用

[2/3] 进程运行状态
✅ Django 运行中
   PID: 12345 - python manage.py runserver...
⚪ Flower - 未运行

[3/3] PID 文件状态
✅ Django
   PID 文件: var/run/django.pid
   PID: 12345 (运行中)
⚠️  Flower
   PID 文件: var/run/flower.pid
   PID: 99999 (进程不存在 - 僵尸文件)
```

---

## 🎯 常见场景

### 场景 1：日常开发重启

```bash
# 推荐：使用重启脚本（自动清理 + 备份日志）
bash script/restart.sh
```

### 场景 2：端口被占用无法启动

```bash
# 方法1：先停止再启动
bash script/stop.sh
bash script/start.sh

# 方法2：直接重启（推荐）
bash script/restart.sh
```

### 场景 3：检查服务状态

```bash
# 快速诊断
bash script/check.sh

# 查看日志
tail -f var/logs/django.log
tail -f var/logs/flower.log
```

### 场景 4：清理僵尸进程

```bash
# 停止脚本会自动清理
bash script/stop.sh
```

---

## 🔧 优化说明

### `stop.sh` 优化（v2.0）

**改进前的问题：**
- ❌ 只依赖 PID 文件，如果文件丢失或手动启动进程无法停止
- ❌ 端口可能被占用，但进程未被清理
- ❌ 残留进程导致重启失败

**改进后的优势：**
- ✅ **三重保障**：PID 文件 → 端口号 → 进程名
- ✅ **强制清理**：确保端口释放
- ✅ **容错性强**：即使 PID 文件丢失也能清理

### `start.sh` 优化（v2.0）

**新增功能：**
- ✅ 启动前检查端口占用
- ✅ 如果端口被占用，提示运行 stop.sh
- ✅ 避免启动失败但进程已创建的情况

### `restart.sh` 优化（v2.0）

**新增功能：**
- ✅ 等待端口释放（最多 10 秒）
- ✅ 自动备份旧日志到 `var/logs/old/`
- ✅ 验证服务完全停止后再启动

---

## 📝 日志管理

### 日志位置

```
var/logs/
├── django.log                      # Django 当前日志
├── flower.log                      # Flower 当前日志
├── celery_orchestrator.log         # Orchestrator Worker 日志
├── celery_scans.log                # Scans Worker 日志
├── celery_beat.log                 # Beat 调度器日志
└── old/                            # 旧日志备份目录
    ├── django_20251106_221000.log
    └── flower_20251106_221000.log
```

### 查看日志

```bash
# 实时查看
tail -f var/logs/django.log

# 查看最近 100 行
tail -n 100 var/logs/django.log

# 搜索错误
grep ERROR var/logs/django.log
```

---

## ⚠️ 注意事项

1. **虚拟环境**：脚本使用 `~/Desktop/scanner/.venv/bin/python`，确保路径正确

2. **Redis 依赖**：启动前确保 Redis 容器运行
   ```bash
   cd ~/Desktop/scanner/docker/infrastructure
   docker-compose up -d redis
   ```

3. **端口占用**：如果遇到端口占用，优先使用 `restart.sh` 而不是手动 kill

4. **日志备份**：重启时会自动备份日志，旧日志保存在 `var/logs/old/`

5. **权限问题**：首次使用需要添加执行权限
   ```bash
   chmod +x script/*.sh
   ```

---

## 🆘 故障排查

### 问题：端口被占用

**症状：**
```
❌ 端口 8888 (Django) 已被占用
```

**解决：**
```bash
bash script/stop.sh
bash script/start.sh
```

### 问题：进程未停止

**症状：**
```
⚠️ 端口仍被占用，可能需要手动检查
```

**解决：**
```bash
# 查看占用进程
lsof -ti:8888
lsof -ti:5555

# 强制停止
bash script/stop.sh
```

### 问题：僵尸 PID 文件

**症状：**
```
⚠️ Django
   PID: 99999 (进程不存在 - 僵尸文件)
```

**解决：**
```bash
# stop.sh 会自动清理僵尸文件
bash script/stop.sh
```

---

## 📚 相关文档

- Django 日志：`var/logs/django.log`
- Celery 日志：`var/logs/celery_*.log`
- Flower 监控：http://localhost:5555
- API 文档：http://localhost:8888/swagger/
