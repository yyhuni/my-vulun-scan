#!/bin/bash
set -e

# 开发环境启动脚本（代码挂载，修改后重启即可生效）

cd "$(dirname "$0")"

# ==================== 检查 Docker 环境 ====================

if ! command -v docker >/dev/null 2>&1; then
    echo "❌ 未检测到 docker 命令，请先安装 Docker。"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 守护进程未运行，请先启动 Docker。"
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

# ==================== 检查环境变量文件 ====================

if [ ! -f .env ]; then
    echo "❌ 未找到 .env 配置文件。"
    exit 1
fi

# ==================== 检查数据库配置 ====================

DB_HOST=$(grep -E "^DB_HOST=" .env | cut -d'=' -f2 | tr -d ' "'"'" || echo "postgres")

if [[ "$DB_HOST" == "postgres" || "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" ]]; then
    echo "📦 使用本地 PostgreSQL 容器"
    PROFILE_ARG="--profile local-db"
else
    echo "🌐 使用远程 PostgreSQL: $DB_HOST"
    PROFILE_ARG=""
fi

# ==================== 启动开发环境 ====================

echo "🚀 正在启动开发环境（代码挂载模式）..."
${COMPOSE_CMD} -f docker-compose.yml -f docker-compose.dev.yml ${PROFILE_ARG} up -d
echo "✅ 开发环境已启动"
echo "  - Prefect UI: http://localhost:4200"
echo "  - Django API: http://localhost:8888"
echo ""
echo "💡 提示:"
echo "  - 修改代码后运行 ./restart-dev.sh 即可生效"
echo "  - 如果修改了 Dockerfile 或 requirements.txt，请运行 ./rebuild-dev.sh"
