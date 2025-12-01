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

# 生成随机字符串（用于开发环境也可以生成随机密码/密钥）
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

# 自动为 docker/.env 填充敏感变量（开发环境也可使用随机值）
auto_fill_docker_env_secrets() {
    local env_file="$1"
    info "自动生成 DJANGO_SECRET_KEY 和 DB_PASSWORD..."
    local gen_django_key
    local gen_db_password
    gen_django_key="$(generate_random_string 64)"
    gen_db_password="$(generate_random_string 32)"
    update_env_var "$env_file" "DJANGO_SECRET_KEY" "$gen_django_key"
    update_env_var "$env_file" "DB_PASSWORD" "$gen_db_password"
    success "密钥生成完成"
}

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
step "[1/3] 检查基础命令 (git tmux curl jq)"
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

# ==============================================================================
# 2. 检查 Docker 环境
# ==============================================================================
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

# ==============================================================================
# 3. 准备 docker/.env（开发模板）并启动 dev 环境
# ==============================================================================
step "[3/3] 初始化开发环境配置"
if [ ! -d "$DOCKER_DIR" ]; then
    error "未找到 docker 目录，请确认项目结构。"
    exit 1
fi

DEV_ENV_EXAMPLE="$DOCKER_DIR/.env.development.example"
TARGET_ENV="$DOCKER_DIR/.env"

if [ ! -f "$DEV_ENV_EXAMPLE" ]; then
    error "未找到 $DEV_ENV_EXAMPLE，无法初始化开发环境配置。"
    exit 1
fi

info "每次运行 install-dev.sh 都会根据 .env.development.example 重新生成 docker/.env..."
cp "$DEV_ENV_EXAMPLE" "$TARGET_ENV"
success "已根据 .env.development.example 重新创建: docker/.env"

# 为当前 dev .env 自动生成新的密钥和数据库密码
auto_fill_docker_env_secrets "$TARGET_ENV"

# 询问是否使用远程 PostgreSQL 数据库（与 install.sh 一致）
echo ""
echo -n -e "${BOLD}${CYAN}❓ 是否使用远程 PostgreSQL 数据库？(y/N) ${RESET}"
read -r use_remote_db
echo

if [[ $use_remote_db =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}   请输入远程 PostgreSQL 配置：${RESET}"

    # 服务器地址（必填）
    echo -n -e "   ${CYAN}服务器地址: ${RESET}"
    read -r db_host
    if [ -z "$db_host" ]; then
        error "服务器地址不能为空"
        exit 1
    fi

    # 端口（可选）
    echo -n -e "   ${CYAN}端口 [5432]: ${RESET}"
    read -r db_port
    db_port=${db_port:-5432}

    # 用户名（必填）
    echo -n -e "   ${CYAN}用户名: ${RESET}"
    read -r db_user
    if [ -z "$db_user" ]; then
        error "用户名不能为空"
        exit 1
    fi

    # 密码（必填）
    echo -n -e "   ${CYAN}密码: ${RESET}"
    read -r db_password
    if [ -z "$db_password" ]; then
        error "密码不能为空"
        exit 1
    fi

    # 验证远程 PostgreSQL 连接
    echo
    info "正在验证远程 PostgreSQL 连接..."
    if ! docker run --rm \
        -e PGPASSWORD="$db_password" \
        postgres:15 \
        psql "postgresql://$db_user@$db_host:$db_port/postgres" -c 'SELECT 1' >/dev/null 2>&1; then
        echo
        error "无法连接到远程 PostgreSQL，请检查 IP/端口/用户名/密码是否正确"
        echo "       尝试连接: postgresql://$db_user@$db_host:$db_port/postgres"
        exit 1
    fi
    success "远程 PostgreSQL 连接验证通过"

    # 尝试创建业务数据库（如果不存在）
    info "检查并创建数据库..."
    db_name=$(grep "^DB_NAME=" "$TARGET_ENV" | cut -d= -f2)
    db_name=${db_name:-xingrin_dev}
    prefect_db=$(grep "^PREFECT_DB_NAME=" "$TARGET_ENV" | cut -d= -f2)
    prefect_db=${prefect_db:-prefect_dev}

    docker run --rm -e PGPASSWORD="$db_password" postgres:15 \
        psql "postgresql://$db_user@$db_host:$db_port/postgres" \
        -c "CREATE DATABASE $db_name;" 2>/dev/null || true
    docker run --rm -e PGPASSWORD="$db_password" postgres:15 \
        psql "postgresql://$db_user@$db_host:$db_port/postgres" \
        -c "CREATE DATABASE $prefect_db;" 2>/dev/null || true
    success "数据库准备完成"

    sed -i "s/^DB_HOST=.*/DB_HOST=$db_host/" "$TARGET_ENV"
    sed -i "s/^DB_PORT=.*/DB_PORT=$db_port/" "$TARGET_ENV"
    sed -i "s/^DB_USER=.*/DB_USER=$db_user/" "$TARGET_ENV"
    sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$db_password/" "$TARGET_ENV"
    success "已配置远程数据库: $db_user@$db_host:$db_port"
else
    info "使用本地 PostgreSQL 容器（docker-compose local-db profile）"
fi

# 是否为远程 VPS 部署（需要从其它机器 / Worker 访问本系统）
echo ""
echo -n -e "${BOLD}${CYAN}❓ 当前是否为远程 VPS 部署 ？(y/N) ${RESET}"
read -r set_public_host
echo
if [[ $set_public_host =~ ^[Yy]$ ]]; then
    echo -n -e "   ${CYAN}请输入当前远程 vps 的外网 IP 地址（例如 10.1.1.1）: ${RESET}"
    read -r public_host
    if [ -z "$public_host" ]; then
        warn "未输入外网ip地址，将保持 .env 中已有的 PUBLIC_HOST（通常为 localhost，仅适合本机调试）"
    else
        update_env_var "$TARGET_ENV" "PUBLIC_HOST" "$public_host"
        success "已配置对外访问地址: $public_host"
    fi
else
    info "检测为本机部署，将保持 .env 中的 PUBLIC_HOST（默认 localhost，仅适合本机访问）"
fi

info "使用以下命令启动开发环境（代码挂载）:"
info "  cd docker && ./start-dev.sh"

cd "$DOCKER_DIR"
./start-dev.sh

success "开发环境已安装并启动。"
echo -e "${GREEN}🌍 访问地址：${RESET}"
printf "   %-16s %s\n" "Prefect UI:" "http://localhost:4200"
printf "   %-16s %s\n" "XingRin API:" "http://localhost:8888"
