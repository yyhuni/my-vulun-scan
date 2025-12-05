#!/bin/bash
# 开发环境重建脚本（Dockerfile 或依赖变更时使用）
set -e

source "$(dirname "$0")/scripts/common.sh"
init_docker_env

DEV_FILES=$(get_dev_compose_files)

echo "🏗️ 重新构建开发环境镜像..."
${COMPOSE_CMD} ${DEV_FILES} build
${COMPOSE_CMD} ${DEV_FILES} up -d
echo "✅ 开发环境已重建并启动"
