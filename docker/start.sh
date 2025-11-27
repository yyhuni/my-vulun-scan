#!/bin/bash
set -e

# 切换到 docker 目录
cd "$(dirname "$0")"

# ==================== 检查 Docker 环境 ====================

# 检查 docker 命令是否存在
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ 未检测到 docker 命令，请先在宿主机安装 Docker（Docker Desktop 或 Docker Engine）。"
    exit 1
fi

# 检查 Docker 守护进程是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 守护进程未运行，请先启动 Docker（例如打开 Docker Desktop）。"
    exit 1
fi

# 选择 docker compose 命令（兼容新旧两种用法）
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ 未检测到 docker-compose 或 docker compose，请先安装 Docker Compose。"
    exit 1
fi

# ==================== 检查环境变量文件 ====================

if [ ! -f .env ]; then
    echo "❌ 未找到 .env 配置文件。"
    echo "   请先根据 .env.example 在当前目录创建并填写 .env，然后再次运行 ./start.sh。"
    exit 1
fi

# ==================== 启动服务 ====================

echo "🚀 正在启动容器服务..."
${COMPOSE_CMD} up -d --build
echo "✅ Services started!"
echo "  - Prefect UI: http://localhost:4200"
echo "  - Django API: http://localhost:8888"
