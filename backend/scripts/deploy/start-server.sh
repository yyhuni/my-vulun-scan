#!/bin/bash
# ============================================
# XingRin 主机启动脚本
# 用途：启动全部服务（Prefect Server + Django + Deployments）
# 适用：主机 / 开发服务器
# ============================================

set -e

# 配置
MARKER_DIR="/opt/xingrin"
SRC_DIR="${MARKER_DIR}/src"

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

log_error() {
    echo -e "${RED}[XingRin]${NC} $1"
}

# 检查安装
check_install() {
    if [ ! -d "${SRC_DIR}/backend" ]; then
        log_error "未找到项目代码，请先运行 install.sh"
        exit 1
    fi
}

# 启动服务
start_services() {
    log_info "=========================================="
    log_info "  XingRin 主机服务启动"
    log_info "=========================================="
    echo ""
    
    cd "${SRC_DIR}/backend"
    
    # 检查 .env 文件
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_info "从 .env.example 创建 .env 文件..."
            cp .env.example .env
            log_info "请编辑 .env 文件配置数据库等参数"
            echo ""
            echo "  vim ${SRC_DIR}/backend/.env"
            echo ""
            log_info "配置完成后重新运行此脚本"
            exit 0
        else
            log_error "未找到 .env 文件，请手动创建"
            exit 1
        fi
    fi
    
    # 激活虚拟环境（如果存在）
    if [ -d "${SRC_DIR}/.venv" ]; then
        source "${SRC_DIR}/.venv/bin/activate"
    fi
    
    # 调用开发启动脚本
    log_info "启动服务..."
    ./scripts/dev/start.sh
}

# 主流程
main() {
    check_install
    start_services
    
    echo ""
    log_success "=========================================="
    log_success "  ✓ 主机服务已启动"
    log_success "=========================================="
    echo ""
    log_info "服务状态: ./scripts/dev/status.sh"
    log_info "停止服务: ./scripts/dev/stop.sh"
    log_info "重启服务: ./scripts/dev/restart.sh"
    echo ""
    log_info "访问地址："
    echo "  - 前端: http://localhost:3000"
    echo "  - 后端 API: http://localhost:8888"
    echo "  - Prefect UI: http://localhost:4200"
}

main "$@"
