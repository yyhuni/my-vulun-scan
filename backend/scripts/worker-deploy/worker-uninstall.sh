#!/bin/bash
# ============================================
# XingRin 远程 Worker 卸载脚本
# 用途：停止并卸载远程 Worker 容器和相关守护进程
# 支持：Ubuntu / Debian
# 特点：幂等执行，多次运行安全
# ============================================

set -e

MARKER_DIR="/opt/xingrin"
SRC_DIR="${MARKER_DIR}/src"
WORKER_DIR="${SRC_DIR}/docker/worker"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
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

log_error() {
    echo -e "${RED}[XingRin]${NC} $1"
}

stop_watchdog() {
    log_info "检查并停止 Watchdog 服务..."

    if command -v systemctl >/dev/null 2>&1; then
        if systemctl list-unit-files | grep -q 'xingrin-watchdog.service'; then
            log_info "停止 xingrin-watchdog 服务..."
            sudo systemctl stop xingrin-watchdog 2>/dev/null || true
            sudo systemctl disable xingrin-watchdog 2>/dev/null || true
            sudo rm -f /etc/systemd/system/xingrin-watchdog.service 2>/dev/null || true
            sudo systemctl daemon-reload 2>/dev/null || true
        fi
    fi

    if [ -f "${MARKER_DIR}/bin/watchdog.sh" ]; then
        log_info "删除 Watchdog 脚本..."
        sudo rm -f "${MARKER_DIR}/bin/watchdog.sh" 2>/dev/null || true
    fi
}

stop_workers() {
    log_info "停止 Worker 容器..."

    if [ -d "${WORKER_DIR}" ]; then
        cd "${WORKER_DIR}" || exit 0

        if command -v docker-compose >/dev/null 2>&1; then
            COMPOSE_CMD="docker-compose"
        else
            COMPOSE_CMD="docker compose"
        fi

        ${COMPOSE_CMD} down 2>/dev/null || true
    fi

    if command -v docker >/dev/null 2>&1; then
        log_info "按名称尝试停止 scan-worker / maintenance-worker 容器..."
        docker stop scan-worker maintenance-worker 2>/dev/null || true
        docker rm scan-worker maintenance-worker 2>/dev/null || true
    fi
}

cleanup_files() {
    if [ -d "${SRC_DIR}" ]; then
        log_info "删除项目代码目录: ${SRC_DIR}"
        sudo rm -rf "${SRC_DIR}"
    fi

    if [ -f "${MARKER_DIR}/.install_done_v1" ]; then
        log_info "删除安装标记 .install_done_v1"
        sudo rm -f "${MARKER_DIR}/.install_done_v1"
    fi

    if [ -f "${MARKER_DIR}/.docker_installed" ]; then
        log_info "删除 Docker 安装标记 .docker_installed"
        sudo rm -f "${MARKER_DIR}/.docker_installed"
    fi

    # 最后删除整个 /opt/xingrin 目录（包括 .bootstrap_done_* 等所有标记和数据）
    if [ -d "${MARKER_DIR}" ]; then
        log_info "删除完整工作目录: ${MARKER_DIR}（包含所有标记文件，例如 .bootstrap_done_v1）"
        sudo rm -rf "${MARKER_DIR}" 2>/dev/null || true
    fi

    log_success "Worker 卸载步骤已完成（/opt/xingrin 目录及相关标记已全部删除）"
}

main() {
    log_info "=========================================="
    log_info "  XingRin Worker 卸载"
    log_info "=========================================="

    stop_watchdog
    stop_workers
    cleanup_files

    log_success "✓ 卸载完成"
}

main "$@"
