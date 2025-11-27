# XingRin 部署脚本

统一的部署脚本，适用于主机和 Worker VPS。

## 目录结构

```
scripts/deploy/
├── bootstrap.sh         # 通用：安装基础依赖
├── install.sh           # 通用：Docker + 代码 + 镜像
├── start-server.sh      # 主机：启动全部服务
├── start-worker.sh      # Worker VPS：启动 Worker 容器
├── stop-worker.sh       # Worker VPS：停止 Worker 容器
├── status.sh            # 通用：状态检查
├── update.sh            # 通用：代码更新
├── watchdog.sh          # Worker VPS：看门狗脚本
└── watchdog-install.sh  # Worker VPS：安装看门狗服务
```

## 部署流程

### 主机 (Server)

```bash
# 1. 初始化
./scripts/deploy/bootstrap.sh

# 2. 安装
./scripts/deploy/install.sh

# 3. 启动全部服务
./scripts/deploy/start-server.sh
```

### Worker VPS

```bash
# 1. 初始化
./scripts/deploy/bootstrap.sh

# 2. 安装
./scripts/deploy/install.sh

# 3. 启动 Worker
./scripts/deploy/start-worker.sh

# 4. (可选) 安装看门狗
./scripts/deploy/watchdog-install.sh
```

## 与其他目录的关系

| 目录 | 用途 | Worker 运行方式 |
|------|------|----------------|
| `scripts/deploy/` | 远程部署（生产） | Docker 容器 |
| `scripts/prefect/` | 本地开发 | Python 进程 |
| `scripts/dev/` | 开发环境一键启动 | 调用 prefect/ |

### 为什么 Worker VPS 用 Docker？

1. **包含完整工具链** - nmap, subfinder, httpx, katana 等
2. **环境隔离** - 不污染宿主机
3. **一致性** - 所有 Worker 环境相同
4. **便于管理** - docker start/stop/restart

### 为什么主机用进程方式？

1. **调试方便** - 可以直接看日志、断点调试
2. **热重载** - 修改代码后自动生效
3. **资源节省** - 不需要额外的 Docker 层

## 日常运维

```bash
# 查看状态
./scripts/deploy/status.sh

# 更新代码
./scripts/deploy/update.sh

# Worker VPS 管理
./scripts/deploy/start-worker.sh   # 启动
./scripts/deploy/stop-worker.sh    # 停止
docker logs -f xingrin-worker      # 查看日志
```

## 看门狗功能

安装后，看门狗会：
- 每 30 秒检查 Worker 容器状态
- 容器停止时自动重启
- (可选) 向主机上报心跳和系统负载

配置心跳上报（在 .env 中添加）：
```env
HEARTBEAT_API_URL=http://your-server.com
WORKER_ID=worker-01
```
