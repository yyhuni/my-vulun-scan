#!/bin/bash
# ============================================
# XingRin Worker 停止脚本
# 用途：停止 Worker 容器
# 适用：Worker VPS
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[XingRin]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[XingRin]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[XingRin]${NC} $1"
}

# 检测 Docker 命令
if docker info >/dev/null 2>&1; then
    DOCKER_CMD="docker"
else
    DOCKER_CMD="sudo docker"
fi

log_info "停止 Worker 容器..."

if $DOCKER_CMD ps -a | grep -q xingrin-worker; then
    $DOCKER_CMD stop xingrin-worker 2>/dev/null || true
    $DOCKER_CMD rm xingrin-worker 2>/dev/null || true
    log_success "Worker 已停止"
else
    log_warn "Worker 容器不存在"
fi
