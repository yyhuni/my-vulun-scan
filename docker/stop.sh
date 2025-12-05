#!/bin/bash
# 生产环境停止脚本
set -e

source "$(dirname "$0")/scripts/common.sh"
init_docker_env

echo "🛑 停止服务..."
${COMPOSE_CMD} down
echo "✅ 服务已停止"
