#!/bin/bash
# ============================================
# XingRin Worker 启动脚本
# 用途：只启动 Prefect Worker（连接远程 Server）
# 适用：Worker VPS
# 
# 兼容两种模式：
# 1. 本地执行：从 .env 文件读取配置
# 2. 远程部署：变量由 deploy_service.py 替换
# ============================================

set -e

# 配置
MARKER_DIR="/opt/xingrin"
SRC_DIR="${MARKER_DIR}/src"
ENV_FILE="${SRC_DIR}/backend/.env"

# 预设变量（远程部署时会被替换，本地执行时保留原样）
# 注意：不要直接修改下面的 {{...}}，deploy_service.py 会查找并替换它们
PRESET_API_URL="{{PREFECT_API_URL}}"
PRESET_DB_NAME="{{DB_NAME}}"
PRESET_DB_USER="{{DB_USER}}"
PRESET_DB_PASSWORD="{{DB_PASSWORD}}"
PRESET_DB_HOST="{{DB_HOST}}"
PRESET_DB_PORT="{{DB_PORT}}"

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

# 检测 Docker 命令
detect_docker() {
    if docker info >/dev/null 2>&1; then
        DOCKER_CMD="docker"
    else
        DOCKER_CMD="sudo docker"
    fi
}

# 检查安装
check_install() {
    if [ ! -d "${SRC_DIR}/backend" ]; then
        log_error "未找到项目代码，请先运行 install.sh"
        exit 1
    fi
    
    if ! $DOCKER_CMD images xingrin-worker:latest --format "{{.ID}}" 2>/dev/null | grep -q .; then
        log_error "未找到 Docker 镜像，请先运行 install.sh"
        exit 1
    fi
}

# 加载配置
load_config() {
    # 1. 尝试使用预设变量（远程部署模式）
    # 检查是否包含 {{...}}，如果包含说明没有被替换，忽略之
    if [[ "$PRESET_API_URL" != *"{{"* ]]; then
        log_info "使用远程部署配置..."
        PREFECT_API_URL="$PRESET_API_URL"
        DB_NAME="$PRESET_DB_NAME"
        DB_USER="$PRESET_DB_USER"
        DB_PASSWORD="$PRESET_DB_PASSWORD"
        DB_HOST="$PRESET_DB_HOST"
        DB_PORT="$PRESET_DB_PORT"
        return
    fi

    # 2. 尝试加载本地 .env（本地执行模式）
    if [ -f "$ENV_FILE" ]; then
        log_info "从 .env 加载配置..."
        set -a
        source "$ENV_FILE"
        set +a
    fi

    # 3. 交互式输入（如果 API URL 为空）
    if [ -z "$PREFECT_API_URL" ]; then
        echo ""
        log_warn "未配置 PREFECT_API_URL"
        echo ""
        read -p "请输入 Prefect Server 地址 (例如: http://192.168.1.100:4200/api): " input_url
        
        if [ -z "$input_url" ]; then
            log_error "PREFECT_API_URL 不能为空"
            exit 1
        fi
        
        PREFECT_API_URL="$input_url"
        
        # 保存到 .env
        echo "PREFECT_API_URL=$PREFECT_API_URL" >> "$ENV_FILE"
        log_success "已保存 PREFECT_API_URL 到 .env"
    fi
}

# 启动 Worker
start_worker() {
    log_info "=========================================="
    log_info "  XingRin Worker 启动"
    log_info "=========================================="
    echo ""
    log_info "Prefect Server: $PREFECT_API_URL"
    
    # 停止旧容器
    $DOCKER_CMD rm -f xingrin-worker 2>/dev/null || true
    
    log_info "启动 Worker 容器..."
    
    # 启动容器
    $DOCKER_CMD run -d \
        --name xingrin-worker \
        --restart=always \
        -v "${SRC_DIR}/backend:/app/backend" \
        -e PREFECT_API_URL="$PREFECT_API_URL" \
        -e DB_NAME="${DB_NAME:-}" \
        -e DB_USER="${DB_USER:-}" \
        -e DB_PASSWORD="${DB_PASSWORD:-}" \
        -e DB_HOST="${DB_HOST:-}" \
        -e DB_PORT="${DB_PORT:-5432}" \
        xingrin-worker:latest
    
    # 等待启动
    sleep 3
    
    # 检查状态
    if $DOCKER_CMD ps | grep -q xingrin-worker; then
        log_success "Worker 容器已启动"
    else
        log_error "Worker 启动失败"
        log_info "查看日志: $DOCKER_CMD logs xingrin-worker"
        exit 1
    fi
}

# 显示完成信息
show_completion() {
    echo ""
    log_success "=========================================="
    log_success "  ✓ Worker 已启动"
    log_success "=========================================="
    echo ""
    log_info "管理命令："
    echo "  - 查看日志: $DOCKER_CMD logs -f xingrin-worker"
    echo "  - 重启: $DOCKER_CMD restart xingrin-worker"
    echo "  - 停止: $DOCKER_CMD stop xingrin-worker"
    echo "  - 更新代码: cd ${SRC_DIR} && git pull"
    echo ""
    log_info "连接到: $PREFECT_API_URL"
}

# 主流程
main() {
    detect_docker
    check_install
    load_config
    start_worker
    show_completion
}

main "$@"
