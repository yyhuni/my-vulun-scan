#!/bin/bash
# 开发环境重启脚本（代码挂载，修改后重启即可生效）
set -e

source "$(dirname "$0")/scripts/common.sh"
init_docker_env

echo "🔄 重启开发环境..."
${COMPOSE_CMD} $(get_dev_compose_files) restart
echo "✅ 开发环境已重启（代码已挂载）"
