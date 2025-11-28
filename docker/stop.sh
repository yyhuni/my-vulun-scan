#!/bin/bash
set -e

# 切换到 docker 目录
cd "$(dirname "$0")"

# ==================== 检查 Docker 环境 ====================

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ 未检测到 docker 命令。"
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

# ==================== 停止服务 ====================

echo "🛑 正在停止容器服务..."
${COMPOSE_CMD} down
echo "✅ 所有服务已停止"
