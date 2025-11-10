# Prefect 部署配置

## 快速开始

### 方式 1: 本地开发模式（推荐）

**特点**：修改代码立即生效，无需重启

```bash
# 终端 1: 启动 Prefect Server
prefect server start

# 终端 2: 启动 Django
cd ~/Desktop/scanner/backend
source ../.venv/bin/activate
python manage.py runserver 8888

# 终端 3: 启动 Worker（本地）
cd ~/Desktop/scanner/backend/apps/scan/deployments
python initiate_scan_deployment.py    # 持续运行
```

**或者启动两个 Flow（推荐）**：

```bash
# 终端 3: 启动扫描任务 Flow
python initiate_scan_deployment.py

# 终端 4: 启动清理任务 Flow
python cleanup_deployment.py
```

---

### 方式 2: Docker 模式

**特点**：Worker 在容器中运行，环境隔离

**步骤 1: 构建镜像**（只需一次）

```bash
cd ~/Desktop/scanner
docker build -t xingrin-backend:local -f docker/worker/Dockerfile .
```

**步骤 2: 启动服务**

```bash
# 终端 1: Prefect Server
prefect server start

# 终端 2: Django
cd ~/Desktop/scanner/backend
python manage.py runserver 8888

# 终端 3: 创建部署
cd ~/Desktop/scanner/backend/apps/scan/deployments
export WORKER_MODE=docker
python initiate_scan_deployment.py
python cleanup_deployment.py

# 终端 4: 启动 Docker Worker
cd ~/Desktop/scanner/docker/worker
docker-compose up -d
```

**修改代码后**：需要重新构建镜像并重启

```bash
docker build -t xingrin-backend:local -f docker/worker/Dockerfile .
cd docker/worker
docker-compose restart
```

---

## 两种模式对比

| 特性 | 本地模式 | Docker 模式 |
|-----|---------|-----------|
| **启动速度** | 快 | 慢（需构建镜像）|
| **代码修改** | 立即生效 | 需重新构建 |
| **环境隔离** | 无 | 完全隔离 |
| **适用场景** | 开发调试 | 生产部署 |
| **推荐度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 环境变量

| 变量名 | 作用 | 可选值 | 默认值 |
|-------|------|--------|--------|
| `WORKER_MODE` | Worker 运行模式 | `local`, `docker` | `local` |

**设置方式**：

```bash
# 临时设置（当前终端）
export WORKER_MODE=docker

# 或者在 .env 文件中设置
echo "WORKER_MODE=docker" >> .env

# 查看当前设置
echo $WORKER_MODE
```

---

## 文件说明

```
apps/scan/deployments/
├── initiate_scan_deployment.py   # 扫描任务部署/服务
├── cleanup_deployment.py          # 清理任务部署/服务
├── start.sh                       # 快速启动脚本
└── README.md                      # 本文件
```

---

## 验证是否运行

访问 Prefect UI: http://localhost:4200

- **Work Pools** → **default**
  - 本地模式：看到 2 个在线 Worker
  - Docker 模式：看到 1 个在线 Worker

- **Deployments**
  - `initiate-scan-on-demand`
  - `cleanup-old-scans-daily`

---

## 常见问题

### Q: 如何停止服务？

**本地模式**：在运行脚本的终端按 `Ctrl+C`

**Docker 模式**：
```bash
cd docker/worker
docker-compose down
```

### Q: 如何查看日志？

**本地模式**：直接在终端查看

**Docker 模式**：
```bash
docker-compose logs -f
```

### Q: 推荐用哪种模式？

**开发阶段**：本地模式（方便调试）  
**生产部署**：Docker 模式（稳定可靠）

---

## 推荐工作流程

### 日常开发

1. 启动 Prefect Server（保持运行）
2. 启动 Django（保持运行）
3. 启动本地 Worker（保持运行）
4. 修改代码，无需重启

### 准备部署

1. 构建 Docker 镜像
2. 测试 Docker 模式
3. 推送到服务器

---

## 下一步

- 查看 Prefect UI: http://localhost:4200
- 测试扫描任务: 通过前端或 API 触发
- 查看执行日志和状态
