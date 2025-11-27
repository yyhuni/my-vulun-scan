#!/bin/bash
# ============================================
# XingRin 环境初始化脚本 (通用)
# 用途：安装基础依赖（git, tmux, curl 等）
# 支持：Ubuntu / Debian
# 适用：主机 & Worker VPS
# 特点：幂等执行，重复运行不会重复安装
# ============================================

set -e

# 版本标记（修改此版本号会触发重新安装）
BOOTSTRAP_VERSION="v1"
MARKER_DIR="/opt/xingrin"
MARKER_FILE="${MARKER_DIR}/.bootstrap_done_${BOOTSTRAP_VERSION}"

# 颜色定义
RED='\033[0;31m'
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

log_error() {
    echo -e "${RED}[XingRin]${NC} $1"
}

# 检查是否已完成初始化
check_already_done() {
    if [ -f "$MARKER_FILE" ]; then
        log_success "环境已初始化 (${BOOTSTRAP_VERSION})，跳过"
        exit 0
    fi
}

# 检查操作系统
check_os() {
    if ! command -v apt-get &> /dev/null; then
        log_error "仅支持 Ubuntu/Debian 系统"
        exit 1
    fi
    log_info "检测到 Ubuntu/Debian 系统"
}

# 安装基础依赖
install_dependencies() {
    log_info "安装基础依赖..."
    
    # 更新包索引
    sudo apt-get update -qq 2>/dev/null || true
    
    # 安装 git（必须）
    if ! command -v git &> /dev/null; then
        log_info "  - 安装 git..."
        sudo apt-get install -y -qq git >/dev/null 2>&1
    else
        log_info "  - git 已安装"
    fi
    
    # 安装 tmux（会话持久化）
    if ! command -v tmux &> /dev/null; then
        log_info "  - 安装 tmux..."
        sudo apt-get install -y -qq tmux >/dev/null 2>&1
    else
        log_info "  - tmux 已安装"
    fi
    
    # 安装 curl（网络请求）
    if ! command -v curl &> /dev/null; then
        log_info "  - 安装 curl..."
        sudo apt-get install -y -qq curl >/dev/null 2>&1
    else
        log_info "  - curl 已安装"
    fi
    
    # 安装 jq（JSON 处理，可选）
    if ! command -v jq &> /dev/null; then
        log_info "  - 安装 jq..."
        sudo apt-get install -y -qq jq >/dev/null 2>&1
    else
        log_info "  - jq 已安装"
    fi
}

# 创建工作目录
create_directories() {
    log_info "创建工作目录..."
    sudo mkdir -p "$MARKER_DIR"
    sudo mkdir -p "${MARKER_DIR}/logs"
    sudo mkdir -p "${MARKER_DIR}/data"
    sudo chmod 755 "$MARKER_DIR"
    sudo chown -R $USER:$USER "$MARKER_DIR"
}

# 写入完成标记
write_marker() {
    echo "Bootstrap completed at $(date)" | sudo tee "$MARKER_FILE" > /dev/null
    log_success "环境初始化完成"
}

# 主流程
main() {
    log_info "=========================================="
    log_info "  XingRin 环境初始化"
    log_info "=========================================="
    
    check_already_done
    check_os
    create_directories
    install_dependencies
    write_marker
    
    log_info "=========================================="
    log_success "  ✓ 初始化完成"
    log_info "=========================================="
    echo ""
    log_info "下一步: 运行 ./install.sh 安装 Docker 并拉取代码"
}

main "$@"
