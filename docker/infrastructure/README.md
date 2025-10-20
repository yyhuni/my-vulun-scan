# 基础设施服务

为后端应用提供基础设施支持服务，包括 Redis、监控等。

## 服务列表

### Redis
- **用途**: 任务队列（Asynq）、缓存
- **端口**: 6379
- **持久化**: AOF（appendonly）
- **数据目录**: Docker 卷 `redis-data`

## 快速开始

### 启动所有服务

```bash
cd docker/infrastructure
docker-compose up -d
```

### 查看服务状态

```bash
docker-compose ps
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 只查看 Redis 日志
docker-compose logs -f redis
```

### 停止服务

```bash
docker-compose down
```

### 停止并删除数据卷

```bash
docker-compose down -v
```

## Redis 使用

### 连接 Redis

```bash
# 从宿主机连接
redis-cli -h localhost -p 6379

# 从容器内连接
docker-compose exec redis redis-cli
```

### 基本操作

```bash
# 检查连接
redis-cli ping

# 查看 Redis 信息
redis-cli info

# 查看所有键
redis-cli keys '*'

# 清空数据库（谨慎使用）
redis-cli flushdb
```

### 监控 Redis

```bash
# 实时监控命令
docker-compose exec redis redis-cli monitor

# 查看统计信息
docker-compose exec redis redis-cli --stat

# 查看慢查询日志
docker-compose exec redis redis-cli slowlog get 10
```

## 数据备份与恢复

### 备份 Redis 数据

```bash
# 创建 RDB 快照
docker-compose exec redis redis-cli save

# 备份数据文件
docker cp vulun-redis:/data ./backup-$(date +%Y%m%d)
```

### 恢复 Redis 数据

```bash
# 1. 停止 Redis
docker-compose stop redis

# 2. 恢复数据文件
docker cp ./backup-YYYYMMDD/. vulun-redis:/data

# 3. 启动 Redis
docker-compose start redis
```

## 配置说明

### 修改 Redis 配置

1. 创建自定义配置文件 `redis.conf`
2. 在 `docker-compose.yml` 中取消注释配置文件挂载
3. 重启服务

示例配置：
```conf
# 最大内存限制
maxmemory 256mb

# 淘汰策略
maxmemory-policy allkeys-lru

# 禁用持久化（如果不需要）
# appendonly no

# 设置密码（生产环境推荐）
# requirepass your_password
```

### 性能优化

```conf
# 禁用 RDB 持久化（如果只需要 AOF）
save ""

# AOF 重写优化
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 网络优化
tcp-backlog 511
tcp-keepalive 300
```

## 扩展服务

### 添加 Redis Commander（Web UI）

在 `docker-compose.yml` 中添加：

```yaml
services:
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: vulun-redis-ui
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOSTS=local:redis:6379
    networks:
      - vulun-network
    depends_on:
      - redis
```

访问：http://localhost:8081

### 添加 Prometheus 监控

```yaml
services:
  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: vulun-redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=redis:6379
    networks:
      - vulun-network
    depends_on:
      - redis
```

## 故障排查

### Redis 无法启动

```bash
# 查看详细日志
docker-compose logs redis

# 检查端口占用
lsof -i :6379

# 重建容器
docker-compose down
docker-compose up -d
```

### 连接被拒绝

```bash
# 检查容器状态
docker-compose ps

# 检查网络
docker network ls
docker network inspect vulun-network

# 测试连接
docker-compose exec redis redis-cli ping
```

### 数据丢失

```bash
# 检查 AOF 文件
docker-compose exec redis ls -lh /data

# 检查 AOF 文件完整性
docker-compose exec redis redis-check-aof /data/appendonly.aof

# 修复 AOF 文件（如果损坏）
docker-compose exec redis redis-check-aof --fix /data/appendonly.aof
```

## 安全建议

1. **设置密码**: 生产环境务必设置 `requirepass`
2. **限制访问**: 使用防火墙限制 6379 端口访问
3. **禁用危险命令**: 使用 `rename-command` 重命名或禁用危险命令
4. **定期备份**: 建立定期备份策略
5. **监控告警**: 配置监控和告警系统

## 后端集成

后端通过以下配置连接 Redis：

```yaml
# backend/config/config.yaml
redis:
  host: "localhost"
  port: 6379
  password: ""
  db: 0

execution:
  redis_url: "redis://localhost:6379/0"
  worker_concurrency: 5
```

## 相关文档

- [Redis 官方文档](https://redis.io/docs/)
- [Redis 最佳实践](https://redis.io/docs/manual/patterns/)
- [Asynq 文档](https://github.com/hibiken/asynq)
