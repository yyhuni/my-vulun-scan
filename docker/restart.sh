#!/bin/bash
set -e

# 切换到 docker 目录
cd "$(dirname "$0")"

# ==================== 检查 Docker 环境 ====================

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ 未检测到 docker 命令。"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 守护进程未运行。"
    exit 1
fi

# 选择 docker compose 命令
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ 未检测到 docker-compose 或 docker compose。"
    exit 1
fi

# ==================== 检查环境变量文件 ====================

if [ ! -f .env ]; then
    echo "❌ 未找到 .env 配置文件。"
    exit 1
fi

# ==================== 重启服务 ====================

echo "🔄 正在重启容器服务..."
${COMPOSE_CMD} restart
echo "✅ 所有服务已重启"
