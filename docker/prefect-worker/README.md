# Prefect Worker Docker 构建说明

这个目录包含专门用于生产环境 Prefect Worker 的 Dockerfile。它基于 Kali Linux，并预装了所有必要的安全扫描工具。

## 1. 构建镜像

**重要**：必须在项目**根目录**下执行构建命令，因为 Dockerfile 需要复制整个后端代码。

```bash
# 在项目根目录 (/path/to/xingrin) 执行：
docker build -f docker/prefect-worker/Dockerfile -t xingrin-worker:latest .
```

## 2. 启动 Worker (VPS 部署)

在远程 VPS 上启动 Worker，连接到中心服务器。

```bash
docker run -d \
  --name xingrin-worker \
  --restart unless-stopped \
  \
  # --- 必填配置 ---
  # 指向中心服务器的 Prefect API
  -e PREFECT_API_URL="http://<中心服务器公网IP>:4200/api" \
  # 指向中心数据库 (Worker 需要写入结果)
  -e DB_HOST="<中心服务器公网IP>" \
  -e DB_PORT="5432" \
  -e DB_NAME="xingrin" \
  -e DB_USER="postgres" \
  -e DB_PASSWORD="<你的数据库密码>" \
  # Redis (如果需要 WebSocket 通知)
  -e REDIS_HOST="<中心服务器公网IP>" \
  \
  # --- 可选配置 ---
  # 指定工作池 (默认: development-pool)
  -e PREFECT_WORKER_POOL="development-pool" \
  # 并发预取 (防止网络延迟导致的任务空闲)
  -e PREFECT_WORKER_PREFETCH_SECONDS=10 \
  \
  xingrin-worker:latest
```

## 3. 包含的工具

该镜像预装了以下工具：

- **Go Tools**:
  - `subfinder` (子域名发现)
  - `naabu` (端口扫描)
  - `httpx` (Web 服务探测)
  - `katana` (现代爬虫)
  - `ffuf` (模糊测试)
  - `amass` (综合信息收集)

- **Python Tools**:
  - `waymore` (历史归档 URL)
  - `uro` (URL 去重/过滤)
  - `Sublist3r` (子域名发现)
  - `OneForAll` (综合子域名收集)

- **System Tools**:
  - `nmap`
  - `chromium` (用于爬虫 headless 模式)
