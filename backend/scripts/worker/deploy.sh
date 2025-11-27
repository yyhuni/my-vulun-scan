#!/bin/bash
# ============================================
# XingRin Worker 部署脚本
# 用途：安装 Docker 并部署 Worker 容器
# 支持：Ubuntu / Debian
# 特点：幂等执行，支持升级
# ============================================

set -e

# 版本标记
DEPLOY_VERSION="v1"
MARKER_DIR="/opt/xingrin"
DEPLOY_MARKER="${MARKER_DIR}/.deploy_done_${DEPLOY_VERSION}"
DOCKER_MARKER="${MARKER_DIR}/.docker_installed"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${CYAN}[Step $1]${NC} $2"
}

# 确保 bootstrap 已完成
check_bootstrap() {
    if [ ! -d "$MARKER_DIR" ]; then
        log_error "请先运行 bootstrap.sh 初始化环境"
        exit 1
    fi
}

# 检测操作系统（仅支持 Ubuntu/Debian）
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    # 仅支持 Ubuntu/Debian
    if [[ "$OS" != "ubuntu" && "$OS" != "debian" ]]; then
        log_error "仅支持 Ubuntu/Debian 系统，当前系统: ${OS}"
        exit 1
    fi
    
    log_info "检测到操作系统: ${OS} ${OS_VERSION}"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装: $(docker --version)"
        touch "$DOCKER_MARKER"
        return 0
    fi
    
    log_step "1/4" "安装 Docker..."
    
    # 安装依赖
    sudo apt-get update -qq
    sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release >/dev/null 2>&1
    
    # 添加 Docker GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/${OS}/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    
    # 添加 Docker 源
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS} $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装 Docker
    sudo apt-get update -qq
    sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
    
    # 启动 Docker
    sudo systemctl enable docker >/dev/null 2>&1 || true
    sudo systemctl start docker >/dev/null 2>&1 || true
    
    # 添加当前用户到 docker 组
    sudo usermod -aG docker $USER 2>/dev/null || true
    
    touch "$DOCKER_MARKER"
    log_success "Docker 安装完成"
}

# 验证 Docker
verify_docker() {
    log_step "2/4" "验证 Docker..."
    
    if ! docker info >/dev/null 2>&1; then
        # 尝试使用 sudo
        if sudo docker info >/dev/null 2>&1; then
            log_warn "Docker 需要 sudo 权限运行"
            DOCKER_CMD="sudo docker"
        else
            log_error "Docker 未正常运行"
            exit 1
        fi
    else
        DOCKER_CMD="docker"
    fi
    
    log_success "Docker 运行正常"
}

# 拉取镜像
pull_images() {
    log_step "3/4" "准备镜像..."
    
    # 这里可以拉取预构建的镜像
    # 目前暂时跳过，后续可以添加
    log_info "镜像准备完成（使用本地构建）"
}

# 显示完成信息
show_completion() {
    log_step "4/4" "部署完成"
    
    echo ""
    log_info "=========================================="
    log_success "  ✓ Worker 部署准备完成"
    log_info "=========================================="
    echo ""
    log_info "下一步操作："
    echo ""
    echo "  # 启动 Worker（替换 <服务器IP> 为实际地址）"
    echo "  docker run -d --name xingrin-worker \\"
    echo "    -e PREFECT_API_URL=http://<服务器IP>:4200/api \\"
    echo "    xingrin-worker:latest"
    echo ""
    
    # 写入部署标记
    echo "Deploy completed at $(date)" | sudo tee "$DEPLOY_MARKER" > /dev/null
}

# 主流程
main() {
    log_info "=========================================="
    log_info "  XingRin Worker 部署"
    log_info "=========================================="
    echo ""
    
    check_bootstrap
    detect_os
    install_docker
    verify_docker
    pull_images
    show_completion
}

main "$@"
