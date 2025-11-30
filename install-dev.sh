#!/bin/bash
set -e

# ==============================================================================
# 开发环境一键安装脚本 (Ubuntu)
# - 使用 docker/.env.development.example 作为模板
# - 启动挂载代码的开发环境（docker-compose.dev.yml）
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info() {
    echo -e "${BLUE}ℹ️  [INFO]${RESET} $1"
}

success() {
    echo -e "${GREEN}✅ [OK]${RESET}   $1"
}

warn() {
    echo -e "${YELLOW}⚠️  [WARN]${RESET} $1"
}

error() {
    echo -e "${RED}❌ [ERROR]${RESET} $1"
}

step() {
    echo -e "\n${BOLD}${CYAN}👉 $1${RESET}"
}

header() {
    echo -e "${BOLD}${BLUE}============================================================${RESET}"
    echo -e "${BOLD}${BLUE}   🧑‍💻  XingRin 开发环境安装${RESET}"
    echo -e "${BOLD}${BLUE}============================================================${RESET}"
}

# ==============================================================================
# 🛡️ 权限检查
# ==============================================================================
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
    echo -e "   正确用法: ${BOLD}sudo ./install-dev.sh${RESET}"
    exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCKER_DIR="$ROOT_DIR/docker"

cd "$ROOT_DIR"
header "XingRin 开发环境一键安装"
info "当前用户: ${BOLD}$REAL_USER${RESET}"
info "项目路径: ${BOLD}$ROOT_DIR${RESET}"

# ==============================================================================
# 1. 检查基础命令
# ==============================================================================
step "[1/3] 检查基础命令 (git tmux curl jq docker)"
MISSING_CMDS=()
for cmd in git tmux curl jq docker; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING_CMDS+=("$cmd")
        warn "未安装: $cmd"
    else
        success "已安装: $cmd"
    fi
done

if [ ${#MISSING_CMDS[@]} -gt 0 ]; then
    info "正在安装缺失命令: ${MISSING_CMDS[*]}..."
    apt update -qq
    apt install -y "${MISSING_CMDS[@]}"
    success "基础命令安装完成"
fi

# ==============================================================================
# 2. 检查 Docker Compose
# ==============================================================================
step "[2/3] 检查 Docker Compose 环境"
if docker compose version >/dev/null 2>&1; then
    success "已安装: docker compose"
else
    info "正在安装 docker-compose-plugin..."
    apt install -y docker-compose-plugin
    success "docker compose 安装完成"
fi

# ==============================================================================
# 3. 准备 docker/.env（开发模板）并启动 dev 环境
# ==============================================================================
step "[3/3] 初始化 docker/.env 并启动开发环境"
if [ ! -d "$DOCKER_DIR" ]; then
    error "未找到 docker 目录，请确认项目结构。"
    exit 1
fi

DEV_ENV_EXAMPLE="$DOCKER_DIR/.env.development.example"
TARGET_ENV="$DOCKER_DIR/.env"

if [ -f "$TARGET_ENV" ]; then
    warn "已存在 docker/.env，将直接使用当前配置。"
else
    if [ ! -f "$DEV_ENV_EXAMPLE" ]; then
        error "未找到 $DEV_ENV_EXAMPLE，无法初始化开发环境配置。"
        exit 1
    fi
    cp "$DEV_ENV_EXAMPLE" "$TARGET_ENV"
    success "已根据 .env.development.example 创建: docker/.env"
fi

info "使用以下命令启动开发环境（代码挂载）:"
info "  cd docker && ./start-dev.sh"

cd "$DOCKER_DIR"
./start-dev.sh

success "开发环境已安装并启动。"
echo -e "${GREEN}🌍 访问地址：${RESET}"
printf "   %-16s %s\n" "Prefect UI:" "http://localhost:4200"
printf "   %-16s %s\n" "XingRin API:" "http://localhost:8888"
