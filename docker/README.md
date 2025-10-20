# Docker 服务目录

本目录包含项目所需的所有 Docker 容器化服务，按职责分为两个子目录。

## 目录结构

```
docker/
├── infrastructure/          # 基础设施服务
│   ├── docker-compose.yml  # Redis 等基础服务配置
│   └── README.md           # 基础设施服务文档
│
└── scanner/                # 扫描工具容器
    ├── Dockerfile          # Kali Linux 扫描环境镜像
    ├── docker-compose.yml  # 扫描容器配置
    ├── setup.sh            # 初始化脚本
    └── README.md           # 扫描容器文档
```

## 服务说明

### 1. Infrastructure（基础设施）

**用途**: 为后端应用提供基础设施支持

**包含服务**:
- **Redis**: 任务队列（Asynq）和缓存服务
- 未来可扩展: 监控、消息队列等

**特点**:
- ✅ 需要持续运行
- ✅ 为后端提供支持
- ✅ 数据需要持久化
- ✅ 独立于业务逻辑

**启动方式**:
```bash
cd infrastructure
docker-compose up -d
```

### 2. Scanner（扫描工具容器）

**用途**: 执行安全扫描工具命令

**包含工具**:
- 子域名发现: subfinder, amass, sublist3r
- 端口扫描: nmap, masscan, rustscan
- 漏洞扫描: nuclei, xray, sqlmap
- Web 扫描: dirsearch, ffuf, gobuster
- 其他: httpx, waybackurls 等

**特点**:
- ✅ 基于 Kali Linux
- ✅ 按需启动/停止
- ✅ 隔离的执行环境
- ✅ 可频繁重建

**启动方式**:
```bash
cd scanner
docker-compose up -d
```

## 快速开始

### 启动所有服务

```bash
# 1. 启动基础设施（Redis）
cd docker/infrastructure
docker-compose up -d

# 2. 启动扫描容器（按需）
cd ../scanner
docker-compose up -d

# 3. 返回项目根目录
cd ../..
```

### 查看服务状态

```bash
# 查看基础设施服务
cd docker/infrastructure && docker-compose ps

# 查看扫描容器
cd docker/scanner && docker-compose ps
```

### 停止所有服务

```bash
# 停止基础设施
cd docker/infrastructure && docker-compose down

# 停止扫描容器
cd docker/scanner && docker-compose down
```

## 网络架构

```
┌─────────────────────────────────────────────────┐
│             宿主机 (Host Machine)                │
│                                                 │
│  ┌─────────────┐  ┌──────────────┐            │
│  │   Backend   │  │   Frontend   │            │
│  │  (Go:8888)  │  │ (Next.js)    │            │
│  └──────┬──────┘  └──────────────┘            │
│         │                                       │
│         │ localhost:6379                        │
│         ▼                                       │
│  ┌─────────────────────────────────────────┐  │
│  │     Infrastructure Network              │  │
│  │                                         │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  Redis (vulun-redis)             │  │  │
│  │  │  - 任务队列 (Asynq)               │  │  │
│  │  │  - 缓存                           │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │     Scanner Network (独立网络)          │  │
│  │                                         │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  Scanner Container               │  │  │
│  │  │  - 安全扫描工具                   │  │  │
│  │  │  - 命令执行环境                   │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └─────────────────────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────┐  │
│  │  PostgreSQL (本地)                      │  │
│  │  localhost:5432                         │  │
│  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## 设计原则

### 为什么分开？

1. **职责分离**
   - Infrastructure: 持续运行的基础服务
   - Scanner: 按需执行的工具容器

2. **生命周期不同**
   - Infrastructure: 需要数据持久化，稳定运行
   - Scanner: 可频繁重建，无状态

3. **资源隔离**
   - Infrastructure: 需要稳定资源保障
   - Scanner: 可能消耗大量资源

4. **网络隔离**
   - Infrastructure: 后端需要访问
   - Scanner: 独立网络，隔离执行

## 开发流程

### 日常开发

```bash
# 1. 确保基础设施运行
cd docker/infrastructure
docker-compose ps  # 检查 Redis 是否运行

# 2. 启动后端
cd ../../backend
go run cmd/main.go

# 3. 启动前端
cd ../front
pnpm dev

# 4. 按需使用扫描容器
cd ../docker/scanner
docker-compose up -d
docker-compose exec vulun-scanner bash
```

### 测试工具执行

```bash
# 进入扫描容器
cd docker/scanner
docker-compose exec vulun-scanner bash

# 在容器内执行扫描工具
nmap -sV example.com
subfinder -d example.com
nuclei -u https://example.com
```

## 故障排查

### Redis 连接失败

```bash
# 检查 Redis 是否运行
cd docker/infrastructure
docker-compose ps redis

# 查看日志
docker-compose logs redis

# 测试连接
redis-cli -h localhost -p 6379 ping
```

### 扫描容器无法启动

```bash
# 检查容器状态
cd docker/scanner
docker-compose ps

# 查看日志
docker-compose logs vulun-scanner

# 重建容器
docker-compose down
docker-compose up -d --build
```

## 维护建议

1. **定期更新镜像**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

2. **清理未使用资源**
   ```bash
   docker system prune -a
   ```

3. **备份 Redis 数据**
   ```bash
   cd docker/infrastructure
   docker cp vulun-redis:/data ./backup-$(date +%Y%m%d)
   ```

4. **监控资源使用**
   ```bash
   docker stats
   ```

## 相关文档

- [Infrastructure README](./infrastructure/README.md) - 基础设施服务详细文档
- [Scanner README](./scanner/README.md) - 扫描容器详细文档
- [工具执行系统设计](../docs/工具执行与实时通知系统设计.md) - 系统架构设计
