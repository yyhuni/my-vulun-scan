#!/bin/bash
#
# 生产环境更新脚本
#
# 执行步骤：
#   1. 前端构建（npm run build）
#   2. 后端更新（docker/update.sh）
#
# 使用方式：
#   ./update.sh              # 执行所有更新
#   ./update.sh --no-pull    # 不拉取代码
#   ./update.sh --rebuild    # 强制重建镜像
#   ./update.sh -y           # 自动模式
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 检查是否跳过前端构建
SKIP_FRONTEND=false
for arg in "$@"; do
    if [ "$arg" = "--skip-frontend" ]; then
        SKIP_FRONTEND=true
    fi
done

echo "========================================"
echo "     生产环境更新脚本"
echo "========================================"
echo ""

# Step 1: 前端构建
if [ "$SKIP_FRONTEND" = "false" ]; then
    log_step "1. 前端构建..."
    
    if [ -d "frontend" ]; then
        cd frontend
        
        # 检查 node_modules
        if [ ! -d "node_modules" ]; then
            log_info "安装前端依赖..."
            npm install
        fi
        
        # 检查依赖是否需要更新
        if [ -f "package-lock.json" ]; then
            log_info "检查依赖更新..."
            npm install
        fi
        
        log_info "执行前端构建..."
        npm run build
        
        cd "$SCRIPT_DIR"
        log_info "前端构建完成"
    else
        log_warn "未找到 frontend 目录，跳过前端构建"
    fi
else
    log_step "1. 跳过前端构建"
fi

# Step 2: 后端更新
log_step "2. 后端更新..."

# 过滤掉 --skip-frontend 参数，传递其他参数给 docker/update.sh
BACKEND_ARGS=()
for arg in "$@"; do
    if [ "$arg" != "--skip-frontend" ]; then
        BACKEND_ARGS+=("$arg")
    fi
done

./docker/update.sh "${BACKEND_ARGS[@]}"

echo ""
log_info "✅ 生产环境更新完成!"
