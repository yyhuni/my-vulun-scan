#!/bin/bash
# 开发环境停止脚本
set -e

source "$(dirname "$0")/scripts/common.sh"
init_docker_env

echo "🛑 停止开发环境..."
${COMPOSE_CMD} $(get_dev_compose_files) down
echo "✅ 开发环境已停止"
