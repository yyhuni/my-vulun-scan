# XingRin Docker 环境

基于 Kali Linux 的安全扫描工具执行环境。

## 目录结构

```
docker/
├── Dockerfile              # 镜像构建文件
├── docker-compose.yml      # Docker Compose 配置
├── .env.example            # 环境变量示例
├── workspace/              # 工作目录（自动创建）
├── tools/                  # 工具安装目录（自动创建）
├── output/                 # 扫描结果输出（自动创建）
├── config/                 # 配置文件（自动创建）
├── wordlists/              # 字典文件（自动创建）
└── scripts/                # 自定义脚本（自动创建）
```

## 快速开始

### 1. 配置环境变量（可选）

```bash
cp .env.example .env
# 编辑 .env 文件，根据需要修改配置
```

### 2. 创建必要的目录

```bash
mkdir -p workspace tools output config wordlists scripts
```

### 3. 构建并启动容器

```bash
# 构建镜像
docker-compose build

# 启动容器（后台运行）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec vulun-scanner bash
```

## 常用命令

### 容器管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f xingrin
```

### 进入容器

```bash
# 交互式进入
docker-compose exec xingrin bash

# 以 root 用户进入
docker-compose exec -u root xingrin bash

# 执行单个命令
docker-compose exec xingrin nmap --version
```

### 数据管理

```bash
# 查看卷列表
docker volume ls

# 清理未使用的卷
docker volume prune

# 备份工作目录
tar -czf backup-$(date +%Y%m%d).tar.gz workspace/ output/

# 恢复工作目录
tar -xzf backup-YYYYMMDD.tar.gz
```

## 配置说明

### 网络模式

默认使用 `bridge` 模式。如果需要直接访问宿主机网络（某些扫描场景），可以修改为：

```yaml
network_mode: host
```

### 特权模式

某些工具（如 nmap 的 SYN 扫描）需要特殊权限。已配置：

```yaml
cap_add:
  - NET_ADMIN
  - NET_RAW
```

如果需要完全特权，可以启用：

```yaml
privileged: true
```

### 资源限制

取消注释 `deploy.resources` 部分来限制 CPU 和内存使用：

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 8G
```

## 环境说明

### 预装语言环境

- Python 3
- Go 1.21.5
- Node.js 20
- Ruby
- Rust
- Java 17

### 预装工具目录

工具会安装在以下位置：
- `/usr/bin/` - 系统工具
- `/usr/local/bin/` - 编译安装的工具
- `/root/go/bin/` - Go 安装的工具

## 扩展配置

### 添加数据库服务

在 `docker-compose.yml` 中添加：

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: vulun_scan
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: vulun_scan_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres-data:
```

### 添加 Redis 服务

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs vulun-scanner

# 检查容器状态
docker-compose ps
```

### 权限问题

```bash
# 修改宿主机目录权限
sudo chown -R $(id -u):$(id -g) workspace/ output/
```

### 网络问题

```bash
# 检查网络
docker network ls
docker network inspect xingrin-network

# 重建网络
docker-compose down
docker network prune
docker-compose up -d
```

### 磁盘空间不足

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune

# 清理所有未使用的资源
docker system prune -a --volumes
```

## 安全建议

1. **不要在生产环境使用 privileged 模式**
2. **定期更新基础镜像**：`docker-compose pull && docker-compose up -d`
3. **使用 .env 文件管理敏感信息**，不要提交到版本控制
4. **限制容器资源使用**，防止资源耗尽
5. **定期备份重要数据**

## 性能优化

1. **使用卷缓存**：已配置 Go 模块缓存卷
2. **分层构建**：Dockerfile 已按阶段优化
3. **多阶段构建**：如需精简可考虑多阶段构建
4. **清理缓存**：定期执行 `docker system prune`

## 开发建议

### 本地开发模式

```bash
# 挂载源代码进行开发
docker-compose run --rm \
  -v $(pwd)/../backend:/backend \
  xingrin bash
```

### 调试模式

```yaml
# 在 docker-compose.yml 中添加
environment:
  - DEBUG=true
  - LOG_LEVEL=debug
```

## 许可证

MIT License
