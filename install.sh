#!/bin/bash
set -e

# ==============================================================================
# 🎨 颜色定义
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ==============================================================================
# 📝 日志函数
# ==============================================================================
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
    echo -e "${BOLD}${BLUE}   🚀  $1${RESET}"
    echo -e "${BOLD}${BLUE}============================================================${RESET}"
}

# ==============================================================================
# 🛡️ 权限检查
# ==============================================================================
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
    echo -e "   正确用法: ${BOLD}sudo ./install.sh${RESET}"
    exit 1
fi

# 获取真实用户（通过 sudo 运行时 $SUDO_USER 是真实用户）
REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 显示标题
header "XingRin 一键安装脚本 (Ubuntu)"
info "当前用户: ${BOLD}$REAL_USER${RESET}"
info "项目路径: ${BOLD}$ROOT_DIR${RESET}"

# ==============================================================================
# 🛠️ 工具函数
# ==============================================================================

# 生成随机字符串
generate_random_string() {
    local length="${1:-32}"
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex "$length" 2>/dev/null | cut -c1-"$length"
    else
        date +%s%N | sha256sum | cut -c1-"$length"
    fi
}

# 更新 .env 文件中的某个键
update_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    if grep -q "^$key=" "$file"; then
        sed -i -e "s|^$key=.*|$key=$value|" "$file"
    else
        echo "$key=$value" >> "$file"
    fi
}

# 用于保存生成的密码，方便最后显示
GENERATED_DB_PASSWORD=""
GENERATED_DJANGO_KEY=""

# 自动为 docker/.env 填充敏感变量
auto_fill_docker_env_secrets() {
    local env_file="$1"
    info "自动生成 DJANGO_SECRET_KEY 和 DB_PASSWORD..."
    GENERATED_DJANGO_KEY="$(generate_random_string 64)"
    GENERATED_DB_PASSWORD="$(generate_random_string 32)"
    update_env_var "$env_file" "DJANGO_SECRET_KEY" "$GENERATED_DJANGO_KEY"
    update_env_var "$env_file" "DB_PASSWORD" "$GENERATED_DB_PASSWORD"
    success "密钥生成完成"
}

# ==============================================================================
# 📦 安装流程
# ==============================================================================

step "[1/3] 检查基础命令"
MISSING_CMDS=()
for cmd in git tmux curl jq; do
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

step "[2/3] 检查 Docker 环境"
if command -v docker >/dev/null 2>&1; then
    success "已安装: docker"
else
    info "正在安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$REAL_USER"
    success "Docker 安装完成"
fi

# 检查 docker compose
if docker compose version >/dev/null 2>&1; then
    success "已安装: docker compose"
else
    info "正在安装 docker-compose-plugin..."
    apt install -y docker-compose-plugin
    success "docker compose 安装完成"
fi

step "[3/3] 初始化配置"
DOCKER_DIR="$ROOT_DIR/docker"
if [ ! -d "$DOCKER_DIR" ]; then
    error "未找到 docker 目录，请确认项目结构。"
    exit 1
fi

if [ -f "$DOCKER_DIR/.env" ]; then
    success "已存在: docker/.env（保留现有配置）"
else
    if [ -f "$DOCKER_DIR/.env.example" ]; then
        cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
        success "已复制: docker/.env.example -> docker/.env"
        auto_fill_docker_env_secrets "$DOCKER_DIR/.env"
    else
        error "未找到 docker/.env.example"
        exit 1
    fi
fi

# ==============================================================================
# 🎉 完成总结
# ==============================================================================
echo
header "安装完成 Summary"

if [ -n "$GENERATED_DB_PASSWORD" ]; then
    echo -e "${YELLOW}🔑 自动生成的配置信息：${RESET}"
    echo -e "------------------------------------------------------------"
    printf "  %-16s %s\n" "数据库用户:" "postgres"
    printf "  %-16s %s\n" "数据库密码:" "$GENERATED_DB_PASSWORD"
    printf "  %-16s %s\n" "Django 密钥:" "${GENERATED_DJANGO_KEY:0:16}... (已保存)"
    echo -e "------------------------------------------------------------"
    echo
fi

echo -e "${GREEN}🚀 启动服务：${RESET}"
echo -e "   cd docker && ./start.sh"
echo
echo -e "${GREEN}🌍 访问地址：${RESET}"
printf "   %-16s %s\n" "Prefect UI:" "http://localhost:4200"
printf "   %-16s %s\n" "XingRin API:" "http://localhost:8888"
echo
