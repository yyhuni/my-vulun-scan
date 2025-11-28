#!/bin/bash
# ============================================
# XingRin Worker 启动脚本
# 用途：启动远程 Worker（使用 docker compose）
# 适用：Worker VPS
# 
# 远程部署时，变量由 deploy_service.py 替换
# ============================================

set -e

# 配置
MARKER_DIR="/opt/xingrin"
SRC_DIR="${MARKER_DIR}/src"
WORKER_DIR="${SRC_DIR}/docker/worker"

# 预设变量（远程部署时会被替换）
PRESET_API_URL="{{PREFECT_API_URL}}"
PRESET_DB_NAME="{{DB_NAME}}"
PRESET_DB_USER="{{DB_USER}}"
PRESET_DB_PASSWORD="{{DB_PASSWORD}}"
PRESET_DB_HOST="{{DB_HOST}}"
PRESET_DB_PORT="{{DB_PORT}}"
PRESET_REDIS_HOST="{{REDIS_HOST}}"
PRESET_REDIS_PORT="{{REDIS_PORT}}"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[XingRin]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[XingRin]${NC} $1"
}

log_warn() {
    echo -e "\033[0;33m[XingRin]${NC} $1"
}

# 检查安装
check_install() {
    if [ ! -d "${WORKER_DIR}" ]; then
        echo "❌ 未找到项目代码，请先运行安装脚本"
        exit 1
    fi
}

# 生成 .env 文件
generate_env() {
    # 检查是否是远程部署模式（变量已被替换）
    if [[ "$PRESET_API_URL" == *"{{"* ]]; then
        log_info "使用已有 .env 配置"
        return
    fi
    
    log_info "生成 .env 配置文件..."
    
    # 复制模板
    if [ -f "${WORKER_DIR}/.env.example" ]; then
        cp "${WORKER_DIR}/.env.example" "${WORKER_DIR}/.env"
    else
        log_warn "未找到 .env.example，将创建基础配置"
        touch "${WORKER_DIR}/.env"
    fi
    
    # 辅助函数：更新或追加变量
    update_env() {
        local key=$1
        local val=$2
        if grep -q "^${key}=" "${WORKER_DIR}/.env"; then
            # 使用 | 作为分隔符，避免 URL 中的 / 冲突
            sed -i "s|^${key}=.*|${key}=${val}|" "${WORKER_DIR}/.env"
        else
            echo "${key}=${val}" >> "${WORKER_DIR}/.env"
        fi
    }
    
    # 更新配置
    update_env "PREFECT_API_URL" "$PRESET_API_URL"
    update_env "DB_HOST" "$PRESET_DB_HOST"
    update_env "DB_PORT" "$PRESET_DB_PORT"
    update_env "DB_NAME" "$PRESET_DB_NAME"
    update_env "DB_USER" "$PRESET_DB_USER"
    update_env "DB_PASSWORD" "$PRESET_DB_PASSWORD"
    update_env "REDIS_HOST" "$PRESET_REDIS_HOST"
    update_env "REDIS_PORT" "$PRESET_REDIS_PORT"
    
    log_success ".env 文件已生成"
}

# 启动 Worker
start_worker() {
    log_info "=========================================="
    log_info "  XingRin Worker 启动"
    log_info "=========================================="
    
    cd "${WORKER_DIR}"
    
    # 选择 docker compose 命令
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    log_info "构建并启动 Worker..."
    ${COMPOSE_CMD} up -d --build
    
    log_success "Worker 已启动"
}

# 显示完成信息
show_completion() {
    echo ""
    log_success "=========================================="
    log_success "  ✓ Worker 已启动"
    log_success "=========================================="
    echo ""
    log_info "管理命令："
    echo "  - 查看日志: cd ${WORKER_DIR} && docker compose logs -f"
    echo "  - 重启: cd ${WORKER_DIR} && docker compose restart"
    echo "  - 停止: cd ${WORKER_DIR} && docker compose down"
    echo ""
}

# 主流程
main() {
    check_install
    generate_env
    start_worker
    show_completion
}

main "$@"
