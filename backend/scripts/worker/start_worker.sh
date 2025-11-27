#!/bin/bash
# ============================================
# XingRin Worker 容器启动脚本
# 用途：启动 Worker Docker 容器
# 支持：Ubuntu / Debian
# 变量：{{API_URL}} - Prefect API 地址
# ============================================

echo "启动 xingrin-worker 容器..."

# 检测 docker 是否需要 sudo
if docker info >/dev/null 2>&1; then
    DOCKER_CMD="docker"
else
    DOCKER_CMD="sudo docker"
fi

# 停止旧容器
$DOCKER_CMD rm -f xingrin-worker 2>/dev/null || true

# 启动新容器
# - --restart=always: 确保开机自启和异常重启
# - PREFECT_API_URL: Worker 连接的 Prefect Server 地址
$DOCKER_CMD run -d \
  --name xingrin-worker \
  --restart=always \
  -e PREFECT_API_URL="{{API_URL}}" \
  xingrin-worker:latest

echo "Worker 容器已启动"
