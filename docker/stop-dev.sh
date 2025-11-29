#!/bin/bash
set -e

# 开发环境停止脚本

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ 未检测到 docker 命令。"
    exit 1
fi

if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ 未检测到 docker-compose 或 docker compose。"
    exit 1
fi

echo "🛑 正在停止开发环境..."
${COMPOSE_CMD} -f docker-compose.yml -f docker-compose.dev.yml down
echo "✅ 开发环境已停止"
