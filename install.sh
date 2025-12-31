#!/bin/bash
set -e

# ==============================================================================
# 用法:
#   sudo ./install.sh                 生产模式（拉取 Docker Hub 镜像）
#   sudo ./install.sh --dev           开发模式（本地构建 + 调试日志）
#   sudo ./install.sh --no-frontend   安装并只启动后端
#   sudo ./install.sh --dev --no-frontend  开发模式 + 只启动后端
# ==============================================================================

# 解析参数
START_ARGS=""
DEV_MODE=false
GIT_MIRROR=""
for arg in "$@"; do
    case $arg in
        --dev) 
            DEV_MODE=true 
            START_ARGS="$START_ARGS --dev"
            ;;
        --no-frontend) 
            START_ARGS="$START_ARGS --no-frontend" 
            ;;
        --mirror)
            GIT_MIRROR="https://gh-proxy.org"
            ;;
        --mirror=*)
            GIT_MIRROR="${arg#*=}"
            ;;
    esac
done

# ==============================================================================
# 颜色定义
# ==============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ==============================================================================
# 日志函数
# ==============================================================================
info() {
    echo -e "${BLUE}[INFO]${RESET} $1"
}

success() {
    echo -e "${GREEN}[OK]${RESET} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${RESET} $1"
}

error() {
    echo -e "${RED}[ERROR]${RESET} $1"
}

step() {
    echo -e "\n${BOLD}${CYAN}>>> $1${RESET}"
}

header() {
    echo -e "${BOLD}${BLUE}============================================================${RESET}"
    echo -e "${BOLD}${BLUE}   $1${RESET}"
    echo -e "${BOLD}${BLUE}============================================================${RESET}"
}

# ==============================================================================
# 显示横幅
# ==============================================================================
show_banner() {
    echo -e "${CYAN}"
    cat << 'EOF'
    __  __ _             ____  _       
    \ \/ /(_)_ __   __ _|  _ \(_)_ __  
     \  / | | '_ \ / _` | |_) | | '_ \ 
     /  \ | | | | | (_| |  _ <| | | | |
    /_/\_\|_|_| |_|\__, |_| \_\_|_| |_|
                   |___/                
EOF
    echo -e "${RESET}"
}

# ==============================================================================
# 权限检查
# ==============================================================================
if [ "$EUID" -ne 0 ]; then
    error "请使用 sudo 运行此脚本"
    echo -e "   正确用法: ${BOLD}sudo ./install.sh${RESET}"
    exit 1
fi

# 获取真实用户（通过 sudo 运行时 $SUDO_USER 是真实用户）
REAL_USER="${SUDO_USER:-$USER}"
# macOS 没有 getent，使用 dscl 或 ~$USER 替代
if command -v getent &>/dev/null; then
    REAL_HOME=$(getent passwd "$REAL_USER" | cut -d: -f6)
else
    REAL_HOME=$(eval echo "~$REAL_USER")
fi

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# 从 VERSION 文件读取版本号
VERSION_FILE="$ROOT_DIR/VERSION"
if [ -f "$VERSION_FILE" ]; then
    APP_VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
else
    error "VERSION 文件不存在，无法确定安装版本"
    exit 1
fi

# 显示标题
show_banner
header "XingRin 一键安装脚本 (Ubuntu)"
info "当前用户: ${BOLD}$REAL_USER${RESET}"
info "项目路径: ${BOLD}$ROOT_DIR${RESET}"
info "安装版本: ${BOLD}$APP_VERSION${RESET}"
if [ -n "$GIT_MIRROR" ]; then
    info "Git 加速: ${BOLD}${GREEN}已启用${RESET} - $GIT_MIRROR"
fi

# ==============================================================================
# 工具函数
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

# 跨平台 sed -i（兼容 macOS 和 Linux）
sed_inplace() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "$@"
    else
        sed -i "$@"
    fi
}

# 更新 .env 文件中的某个键
update_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    if grep -q "^$key=" "$file"; then
        sed_inplace "s|^$key=.*|$key=$value|" "$file"
    else
        echo "$key=$value" >> "$file"
    fi
}

# 用于保存生成的密码，方便最后显示
GENERATED_DB_PASSWORD=""
GENERATED_DJANGO_KEY=""

# 生成自签 HTTPS 证书（使用容器，避免宿主机 openssl 兼容性问题）
generate_self_signed_cert() {
    local ssl_dir="$DOCKER_DIR/nginx/ssl"
    local fullchain="$ssl_dir/fullchain.pem"
    local privkey="$ssl_dir/privkey.pem"

    if [ -f "$fullchain" ] && [ -f "$privkey" ]; then
        success "检测到已有 HTTPS 证书，跳过自签"
        return
    fi

    info "未检测到 HTTPS 证书，正在生成自签证书（localhost）..."
    mkdir -p "$ssl_dir"

    # 使用容器生成证书，避免依赖宿主机 openssl 版本
    if docker run --rm -v "$ssl_dir:/ssl" alpine/openssl \
        req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout /ssl/privkey.pem \
        -out /ssl/fullchain.pem \
        -subj "/C=CN/ST=NA/L=NA/O=XingRin/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
        >/dev/null 2>&1; then
        success "自签证书已生成: $ssl_dir"
    else
        warn "自签证书生成失败，请手动放置证书到 $ssl_dir"
    fi
}

# 自动为 docker/.env 填充敏感变量
auto_fill_docker_env_secrets() {
    local env_file="$1"
    info "自动生成 DJANGO_SECRET_KEY、DB_PASSWORD 和 WORKER_API_KEY..."
    GENERATED_DJANGO_KEY="$(generate_random_string 64)"
    GENERATED_DB_PASSWORD="$(generate_random_string 32)"
    GENERATED_WORKER_API_KEY="$(generate_random_string 32)"
    update_env_var "$env_file" "DJANGO_SECRET_KEY" "$GENERATED_DJANGO_KEY"
    update_env_var "$env_file" "DB_PASSWORD" "$GENERATED_DB_PASSWORD"
    update_env_var "$env_file" "WORKER_API_KEY" "$GENERATED_WORKER_API_KEY"
    success "密钥生成完成"
}

# 配置 Docker 镜像加速
# 使用国内公共镜像源（pull-through cache 模式，首次拉取会从 Docker Hub 同步）
configure_docker_mirror() {
    local daemon_json="/etc/docker/daemon.json"
    
    # 这些镜像源采用 pull-through cache 模式：
    # - 首次拉取：从 Docker Hub 获取并缓存
    # - 后续拉取：直接从缓存返回
    # - 支持所有公开镜像，包括用户上传的最新镜像
    local mirrors='[
        "https://docker.1ms.run",
        "https://docker.1panel.live",
        "https://hub.rat.dev",
        "https://docker.m.daocloud.io",
        "https://dockerproxy.net"
    ]'
    
    info "配置 Docker 镜像加速..."
    
    # 确保 Docker 配置目录存在
    mkdir -p /etc/docker
    
    if [ ! -f "$daemon_json" ]; then
        # 文件不存在，直接创建
        echo "{\"registry-mirrors\": $mirrors}" | jq '.' > "$daemon_json"
        success "Docker 镜像加速配置完成"
    else
        # 文件存在，用 jq 合并配置
        if jq -e '.' "$daemon_json" >/dev/null 2>&1; then
            # 有效的 JSON，合并配置
            local temp_file=$(mktemp)
            jq --argjson mirrors "$mirrors" '. + {"registry-mirrors": $mirrors}' "$daemon_json" > "$temp_file"
            mv "$temp_file" "$daemon_json"
            success "Docker 镜像加速配置已合并到现有配置"
        else
            # 无效的 JSON，备份后重新创建
            warn "现有 daemon.json 格式无效，已备份为 daemon.json.bak"
            cp "$daemon_json" "${daemon_json}.bak"
            echo "{\"registry-mirrors\": $mirrors}" | jq '.' > "$daemon_json"
            success "Docker 镜像加速配置完成"
        fi
    fi
    
    # 重启 Docker 使配置生效
    if systemctl is-active --quiet docker; then
        info "重启 Docker 服务..."
        systemctl restart docker
        sleep 2
        if systemctl is-active --quiet docker; then
            success "Docker 服务重启完成"
        else
            warn "Docker 服务重启失败，请手动检查"
        fi
    fi
}

# 获取加速后的 Docker 镜像地址（保留函数以兼容现有代码）
get_accelerated_image() {
    local image="$1"
    # 镜像加速通过 daemon.json 的 registry-mirrors 实现
    # 这里直接返回原始地址
    echo "$image"
}

# 显示安装总结信息
show_summary() {
    echo
    if [ "$1" == "success" ]; then
        header "服务已成功启动！"
    else
        header "安装完成 Summary"
    fi

    if [ -f "$DOCKER_DIR/.env" ]; then
        # 从 .env 读取配置用于显示
        DB_HOST=$(grep "^DB_HOST=" "$DOCKER_DIR/.env" | cut -d= -f2)
        DB_USER=$(grep "^DB_USER=" "$DOCKER_DIR/.env" | cut -d= -f2)
        DB_PASSWORD=$(grep "^DB_PASSWORD=" "$DOCKER_DIR/.env" | cut -d= -f2)
        
        echo -e "${YELLOW}数据库配置：${RESET}"
        echo -e "------------------------------------------------------------"
        echo -e "  服务器地址: ${DB_HOST:-未知}"
        echo -e "  用户名: ${DB_USER:-未知}"
        echo -e "  密码: ${DB_PASSWORD:-未知}"
        echo -e "------------------------------------------------------------"
        echo
    fi

    # 获取访问地址
    PUBLIC_HOST=$(grep "^PUBLIC_HOST=" "$DOCKER_DIR/.env" 2>/dev/null | cut -d= -f2)
    if [ -n "$PUBLIC_HOST" ] && [ "$PUBLIC_HOST" != "server" ]; then
        ACCESS_HOST="$PUBLIC_HOST"
    else
        ACCESS_HOST="localhost"
    fi
    
    echo -e "${GREEN}访问地址：${RESET}"
    printf "   %-16s %s\n" "XingRin:" "https://${ACCESS_HOST}:8083/"
    echo
    
    echo -e "${YELLOW}默认登录账号：${RESET}"
    printf "   %-16s %s\n" "用户名:" "admin"
    printf "   %-16s %s\n" "密码:" "admin"
    echo -e "${YELLOW}   [!] 请首次登录后修改密码!${RESET}"
    echo
    
    if [ "$1" != "success" ]; then
        echo -e "${GREEN}后续启动命令：${RESET}"
        echo -e "   ./start.sh              # 启动所有服务"
        echo -e "   ./start.sh --no-frontend # 只启动后端"
        echo -e "   ./stop.sh               # 停止所有服务"
        echo
    fi
    
    echo -e "${YELLOW}[!] 云服务器某些厂商默认开启了安全策略（阿里云/腾讯云/华为云等）：${RESET}"
    echo -e "   端口未放行可能导致无法访问或无法扫描，强烈推荐用国外vps，或者在云控制台放行："
    echo -e "   ${RESET}8083, 5432"
    echo
}

# ==============================================================================
# 安装流程
# ==============================================================================

step "[1/3] 检查基础命令"
MISSING_CMDS=()
for cmd in git curl jq; do
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
    
    # 根据是否启用加速选择下载方式
    if [ -n "$GIT_MIRROR" ]; then
        # 使用阿里云 Docker 安装脚本（国内加速）
        info "使用国内镜像安装 Docker..."
        if curl -fsSL https://get.docker.com | sh -s -- --mirror Aliyun; then
            success "Docker 安装完成（使用阿里云镜像）"
        else
            warn "阿里云镜像安装失败，尝试官方源..."
            if curl -fsSL https://get.docker.com | sh; then
                success "Docker 安装完成"
            else
                error "Docker 安装失败"
                exit 1
            fi
        fi
    else
        # 默认从官方源下载
        if curl -fsSL https://get.docker.com | sh; then
            success "Docker 安装完成"
        else
            error "Docker 安装脚本下载失败"
            error "如果您在中国大陆，建议使用 --mirror 参数启用加速"
            exit 1
        fi
    fi
    
    usermod -aG docker "$REAL_USER"
    
    # 配置 Docker 镜像加速（仅当启用 --mirror 时）
    if [ -n "$GIT_MIRROR" ]; then
        configure_docker_mirror
    fi
fi

# 如果 Docker 已安装但启用了 --mirror，也配置镜像加速
if [ -n "$GIT_MIRROR" ] && command -v docker &>/dev/null; then
    # 检查是否已配置镜像加速
    if [ ! -f "/etc/docker/daemon.json" ] || ! grep -q "registry-mirrors" /etc/docker/daemon.json 2>/dev/null; then
        configure_docker_mirror
    fi
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
# 交换分区配置（仅 Linux）
# ==============================================================================
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # 获取当前内存大小（GB，四舍五入）
    TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_MEM_GB=$(awk "BEGIN {printf \"%.0f\", $TOTAL_MEM_KB / 1024 / 1024}")
    
    # 获取当前交换分区大小（GB，四舍五入）
    CURRENT_SWAP_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
    CURRENT_SWAP_GB=$(awk "BEGIN {printf \"%.0f\", $CURRENT_SWAP_KB / 1024 / 1024}")
    
    # 推荐交换分区大小（与内存相同，最小1G，最大8G）
    RECOMMENDED_SWAP=$TOTAL_MEM_GB
    [ "$RECOMMENDED_SWAP" -lt 1 ] && RECOMMENDED_SWAP=1
    [ "$RECOMMENDED_SWAP" -gt 8 ] && RECOMMENDED_SWAP=8
    
    echo ""
    info "系统内存: ${TOTAL_MEM_GB}GB，当前交换分区: ${CURRENT_SWAP_GB}GB"
    
    # 如果交换分区小于推荐值，提示用户
    if [ "$CURRENT_SWAP_GB" -lt "$RECOMMENDED_SWAP" ]; then
        echo -n -e "${BOLD}${CYAN}[?] 是否开启 ${RECOMMENDED_SWAP}GB 交换分区？可提升扫描稳定性 (Y/n) ${RESET}"
        read -r setup_swap
        echo
        if [[ ! $setup_swap =~ ^[Nn]$ ]]; then
            info "正在配置 ${RECOMMENDED_SWAP}GB 交换分区..."
            if bash "$ROOT_DIR/docker/scripts/setup-swap.sh" "$RECOMMENDED_SWAP"; then
                success "交换分区配置完成"
            else
                warn "交换分区配置失败，继续安装..."
            fi
        else
            info "跳过交换分区配置"
        fi
    else
        success "交换分区已足够: ${CURRENT_SWAP_GB}GB"
    fi
fi

step "[3/3] 初始化配置"

# 创建数据目录
info "创建数据目录..."
mkdir -p /opt/xingrin/{results,logs,fingerprints,wordlists,nuclei-repos}
chmod -R 777 /opt/xingrin
success "数据目录已创建: /opt/xingrin/"

DOCKER_DIR="$ROOT_DIR/docker"
if [ ! -d "$DOCKER_DIR" ]; then
    error "未找到 docker 目录，请确认项目结构。"
    exit 1
fi

if [ -f "$DOCKER_DIR/.env.example" ]; then
    cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
    success "已创建: docker/.env"
    auto_fill_docker_env_secrets "$DOCKER_DIR/.env"
    
    # 写入版本号（锁定安装时的版本）
    update_env_var "$DOCKER_DIR/.env" "IMAGE_TAG" "$APP_VERSION"
    success "已锁定版本: IMAGE_TAG=$APP_VERSION"
    
    # Git 加速仅用于安装过程，不写入运行时配置
    # 运行时用户如需加速，可通过代理或其他方式自行配置
    if [ -n "$GIT_MIRROR" ]; then
        info "Git 加速已启用（仅用于安装阶段）"
    fi
    
    # 开发模式：开启调试日志
    if [ "$DEV_MODE" = true ]; then
        info "开发模式：开启调试配置..."
        update_env_var "$DOCKER_DIR/.env" "DEBUG" "True"
        update_env_var "$DOCKER_DIR/.env" "LOG_LEVEL" "INFO"
        update_env_var "$DOCKER_DIR/.env" "ENABLE_COMMAND_LOGGING" "true"
        success "已开启: DEBUG=True, LOG_LEVEL=INFO, ENABLE_COMMAND_LOGGING=true"
    fi
    
    # 询问数据库配置
    echo ""
    echo -n -e "${BOLD}${CYAN}[?] 是否使用远程 PostgreSQL 数据库？(y/N) ${RESET}"
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
        
        # 验证远程 PostgreSQL 连接（使用官方 postgres 镜像中的 psql）
        echo
        info "正在验证远程 PostgreSQL 连接..."
        # 使用 postgres 默认库验证连接（每个 PostgreSQL 都有这个库）
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
        db_name=$(grep "^DB_NAME=" "$DOCKER_DIR/.env" | cut -d= -f2)
        db_name=${db_name:-xingrin}
        prefect_db=$(grep "^PREFECT_DB_NAME=" "$DOCKER_DIR/.env" | cut -d= -f2)
        prefect_db=${prefect_db:-prefect}
        
        docker run --rm -e PGPASSWORD="$db_password" postgres:15 \
            psql "postgresql://$db_user@$db_host:$db_port/postgres" \
            -c "CREATE DATABASE $db_name;" 2>/dev/null || true
        docker run --rm -e PGPASSWORD="$db_password" postgres:15 \
            psql "postgresql://$db_user@$db_host:$db_port/postgres" \
            -c "CREATE DATABASE $prefect_db;" 2>/dev/null || true
        success "数据库准备完成"
        
        sed_inplace "s/^DB_HOST=.*/DB_HOST=$db_host/" "$DOCKER_DIR/.env"
        sed_inplace "s/^DB_PORT=.*/DB_PORT=$db_port/" "$DOCKER_DIR/.env"
        sed_inplace "s/^DB_USER=.*/DB_USER=$db_user/" "$DOCKER_DIR/.env"
        sed_inplace "s/^DB_PASSWORD=.*/DB_PASSWORD=$db_password/" "$DOCKER_DIR/.env"
        success "已配置远程数据库: $db_user@$db_host:$db_port"
    else
        info "使用本地 PostgreSQL 容器"
    fi

    # 是否为远程 VPS 部署（需要从其它机器 / Worker 访问本系统）
    echo ""
    echo -n -e "${BOLD}${CYAN}[?] 当前是否为远程 VPS 部署？(y/N) ${RESET}"
    read -r set_public_host
    echo
    if [[ $set_public_host =~ ^[Yy]$ ]]; then
        echo -n -e "   ${CYAN}请输入当前远程 vps 的外网 IP 地址（例如 10.1.1.1）: ${RESET}"
        read -r public_host
        if [ -z "$public_host" ]; then
            warn "未输入外网ip地址，将保持 .env 中已有的 PUBLIC_HOST（请确保 Worker 能访问该地址）"
        else
            update_env_var "$DOCKER_DIR/.env" "PUBLIC_HOST" "$public_host"
            success "已配置对外访问地址: $public_host"
        fi
    else
        info "检测为本机 docker 部署，将 PUBLIC_HOST 设置为 server（容器内部访问后端服务名）"
        update_env_var "$DOCKER_DIR/.env" "PUBLIC_HOST" "server"
    fi
else
    error "未找到 docker/.env.example"
    exit 1
fi

# 准备 HTTPS 证书（无域名也可使用自签）
generate_self_signed_cert

# ==============================================================================
# 预拉取 Worker 镜像（避免扫描时等待）
# ==============================================================================
step "预拉取 Worker 镜像..."
DOCKER_USER=$(grep "^DOCKER_USER=" "$DOCKER_DIR/.env" 2>/dev/null | cut -d= -f2)
DOCKER_USER=${DOCKER_USER:-yyhuni}
WORKER_IMAGE="${DOCKER_USER}/xingrin-worker:${APP_VERSION}"

# 开发模式下构建本地 worker 镜像
if [ "$DEV_MODE" = true ]; then
    info "开发模式：构建本地 Worker 镜像..."
    if docker compose -f "$DOCKER_DIR/docker-compose.dev.yml" build worker; then
        # 设置 TASK_EXECUTOR_IMAGE 环境变量指向本地构建的镜像（使用版本号-dev标识）
        update_env_var "$DOCKER_DIR/.env" "TASK_EXECUTOR_IMAGE" "docker-worker:${APP_VERSION}-dev"
        success "本地 Worker 镜像构建完成: docker-worker:${APP_VERSION}-dev"
    else
        error "开发模式下本地 Worker 镜像构建失败！"
        error "请检查构建错误并修复后重试"
        exit 1
    fi
else
    info "正在拉取: $WORKER_IMAGE"
    
    # 镜像加速通过 daemon.json 的 registry-mirrors 实现
    PULL_IMAGE="$WORKER_IMAGE"
    
    if [ -n "$GIT_MIRROR" ]; then
        info "已配置 Docker 镜像加速，拉取将自动走加速通道"
    fi
    
    if docker pull "$PULL_IMAGE"; then
        success "Worker 镜像拉取完成"
    else
        error "Worker 镜像拉取失败，无法继续安装"
        error "镜像地址: $WORKER_IMAGE"
        echo
        if [ -z "$GIT_MIRROR" ]; then
            warn "如果您在中国大陆，建议使用 --mirror 参数启用加速："
            echo -e "   ${BOLD}sudo ./install.sh --mirror${RESET}"
        else
            warn "镜像加速已配置，但拉取仍然失败，可能原因："
            echo -e "   1. 镜像源暂时不可用，请稍后重试"
            echo -e "   2. 网络连接问题"
            echo -e "   3. 镜像不存在或版本错误"
        fi
        echo
        exit 1
    fi
fi

# ==============================================================================
# 预下载 Nuclei 模板仓库（在容器外执行，支持 Git 加速）
# ==============================================================================
step "预下载 Nuclei 模板仓库..."
NUCLEI_TEMPLATES_DIR="/opt/xingrin/nuclei-repos/nuclei-templates"
NUCLEI_TEMPLATES_REPO="https://github.com/projectdiscovery/nuclei-templates.git"

# 确保目录存在
mkdir -p /opt/xingrin/nuclei-repos

if [ -d "$NUCLEI_TEMPLATES_DIR/.git" ]; then
    info "Nuclei 模板仓库已存在，跳过下载"
else
    # 构建 clone URL（如果启用了 Git 加速）
    if [ -n "$GIT_MIRROR" ]; then
        CLONE_URL="${GIT_MIRROR}/${NUCLEI_TEMPLATES_REPO}"
        info "使用 Git 加速下载: $CLONE_URL"
    else
        CLONE_URL="$NUCLEI_TEMPLATES_REPO"
    fi
    
    # 执行 git clone
    if git clone --depth 1 "$CLONE_URL" "$NUCLEI_TEMPLATES_DIR"; then
        success "Nuclei 模板仓库下载完成"
    else
        warn "Nuclei 模板仓库下载失败，将在服务启动后重试"
        warn "您也可以稍后在 Web 界面「Nuclei 模板」中手动同步"
    fi
fi

# ==============================================================================
# 启动服务
# ==============================================================================
step "正在启动服务..."
"$ROOT_DIR/start.sh" $START_ARGS

# ==============================================================================
# 完成总结
# ==============================================================================
show_summary "success"
