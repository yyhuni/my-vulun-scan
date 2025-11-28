#!/bin/bash
# ============================================
# XingRin 远程 Worker 安装脚本
# 用途：安装 Docker、拉取代码、准备环境
# 支持：Ubuntu / Debian
# 特点：幂等执行，支持升级
# ============================================

set -e

# 版本标记
INSTALL_VERSION="v1"
MARKER_DIR="/opt/xingrin"
INSTALL_MARKER="${MARKER_DIR}/.install_done_${INSTALL_VERSION}"
DOCKER_MARKER="${MARKER_DIR}/.docker_installed"

# 项目配置
GITHUB_REPO="https://github.com/yyhuni/my-vulun-scan.git"
GITHUB_BRANCH="feature/migrate-to-prefect"
SRC_DIR="${MARKER_DIR}/src"

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

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
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

# 拉取项目代码
pull_source() {
    log_step "3/4" "拉取项目代码..."
    
    if [ -d "${SRC_DIR}/.git" ]; then
        log_info "更新项目代码..."
        cd "${SRC_DIR}"
        git fetch origin
        git checkout "${GITHUB_BRANCH}"
        git pull origin "${GITHUB_BRANCH}"
        log_success "代码更新完成"
    else
        log_info "从 GitHub 克隆项目: ${GITHUB_REPO}"
        mkdir -p "${SRC_DIR}"
        git clone -b "${GITHUB_BRANCH}" "${GITHUB_REPO}" "${SRC_DIR}"
        log_success "代码克隆完成"
    fi
}

# 准备配置文件
prepare_env() {
    log_step "4/4" "准备配置文件..."
    
    WORKER_DIR="${SRC_DIR}/docker/worker"
    
    if [ ! -f "${WORKER_DIR}/.env" ]; then
        if [ -f "${WORKER_DIR}/.env.example" ]; then
            cp "${WORKER_DIR}/.env.example" "${WORKER_DIR}/.env"
            log_warn "已创建 .env 文件，请修改其中的配置！"
        fi
    else
        log_info ".env 文件已存在"
    fi
}

# 显示完成信息
show_completion() {
    WORKER_DIR="${SRC_DIR}/docker/worker"
    
    echo ""
    log_info "=========================================="
    log_success "  ✓ 安装完成"
    log_info "=========================================="
    echo ""
    log_info "项目代码位置: ${SRC_DIR}"
    echo ""
    log_warn "下一步操作："
    echo ""
    echo "  1. 编辑配置文件，填写主机地址："
    echo "     vi ${WORKER_DIR}/.env"
    echo ""
    echo "  2. 启动 Worker："
    echo "     cd ${WORKER_DIR}"
    echo "     docker compose up -d --build"
    echo ""
    echo "  3. 查看日志："
    echo "     docker compose logs -f"
    echo ""
    
    # 写入安装标记
    echo "Install completed at $(date)" | tee "$INSTALL_MARKER" > /dev/null
}

# 主流程
main() {
    log_info "=========================================="
    log_info "  XingRin 安装"
    log_info "=========================================="
    echo ""
    
    check_bootstrap
    detect_os
    install_docker
    verify_docker
    pull_source
    prepare_env
    show_completion
}

main "$@"
