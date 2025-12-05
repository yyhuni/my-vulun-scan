#!/bin/bash
# 生产环境重启脚本
set -e

source "$(dirname "$0")/scripts/common.sh"
init_docker_env_with_env_check

echo "🔄 重启服务..."
${COMPOSE_CMD} restart
echo "✅ 服务已重启"
