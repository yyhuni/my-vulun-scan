#!/bin/bash
set -e

# 开发环境重建脚本
# 仅在 Dockerfile 或依赖变更时使用

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

echo "🏗️ 正在重新构建开发环境镜像..."
${COMPOSE_CMD} -f docker-compose.yml -f docker-compose.dev.yml build
${COMPOSE_CMD} -f docker-compose.yml -f docker-compose.dev.yml up -d

echo "✅ 开发环境已重建并启动"
