#!/bin/bash
# ============================================
# XingRin Agent 启动脚本
# 用途：启动 agent 容器（心跳上报 + 负载监控）
# 
# 架构说明：
# - 使用 docker run 直接启动 agent 容器
# - agent 负责心跳上报和系统负载监控
# - 扫描任务由主服务器通过 SSH 执行独立的 worker 容器
# - 镜像版本由主服务器传入，确保版本一致性
# 
# 镜像拉取：
# - 使用 --pull=missing，优先使用本地镜像
# - 如果本地没有则从 Docker Hub 拉取
# ============================================

set -e

MARKER_DIR="/opt/xingrin"
CONTAINER_NAME="xingrin-agent"
# 使用轻量 agent 镜像（~30MB），仅包含心跳上报功能
# 镜像版本由部署时传入（必须设置）
DOCKER_USER="${DOCKER_USER:-yyhuni}"
if [ -z "$IMAGE_TAG" ]; then
    echo "[ERROR] IMAGE_TAG 未设置，请确保部署时传入版本号"
    exit 1
fi
IMAGE="${DOCKER_USER}/xingrin-agent:${IMAGE_TAG}"

# 预设变量（远程部署时由 deploy_service.py 替换）
PRESET_SERVER_URL="{{HEARTBEAT_API_URL}}"
PRESET_WORKER_ID="{{WORKER_ID}}"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[XingRin]${NC} $1"; }
log_success() { echo -e "${GREEN}[XingRin]${NC} $1"; }

# 停止旧容器
stop_old() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_info "停止旧的 agent 容器..."
        docker stop ${CONTAINER_NAME} 2>/dev/null || true
        docker rm ${CONTAINER_NAME} 2>/dev/null || true
    fi
    # 兼容旧名称
    if docker ps -a --format '{{.Names}}' | grep -q "^xingrin-watchdog$"; then
        docker stop xingrin-watchdog 2>/dev/null || true
        docker rm xingrin-watchdog 2>/dev/null || true
    fi
}

# 启动 agent
start_agent() {
    log_info "=========================================="
    log_info "  XingRin Agent 启动"
    log_info "=========================================="
    
    log_info "启动 agent 容器..."
    # --pull=missing: 本地没有镜像时才拉取
    # 版本更新由服务端通过 SSH 显式 docker pull 触发
    docker run -d --pull=missing \
        --name ${CONTAINER_NAME} \
        --restart always \
        -e SERVER_URL="${PRESET_SERVER_URL}" \
        -e WORKER_ID="${PRESET_WORKER_ID}" \
        -e IMAGE_TAG="${IMAGE_TAG}" \
        -v /proc:/host/proc:ro \
        ${IMAGE}
    
    log_success "Agent 已启动"
}

# 显示完成信息
show_completion() {
    echo ""
    log_success "=========================================="
    log_success "  ✓ Agent 已启动"
    log_success "=========================================="
    echo ""
    log_info "管理命令："
    echo "  - 查看日志: docker logs -f ${CONTAINER_NAME}"
    echo "  - 重启: docker restart ${CONTAINER_NAME}"
    echo "  - 停止: docker stop ${CONTAINER_NAME}"
    echo ""
}

# 主流程
main() {
    stop_old
    start_agent
    show_completion
}

main "$@"
