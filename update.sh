#!/bin/bash
#
# 生产环境更新脚本
#
# 执行步骤：
#   1. 拉取最新代码（git pull）
#   2. 前端构建（npm run build）
#   3. 后端更新（docker/update.sh --no-pull）
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

# 解析参数
SKIP_FRONTEND=false
NO_PULL=false
for arg in "$@"; do
    if [ "$arg" = "--skip-frontend" ]; then
        SKIP_FRONTEND=true
    fi
    if [ "$arg" = "--no-pull" ]; then
        NO_PULL=true
    fi
done

echo "========================================"
echo "     生产环境更新脚本"
echo "========================================"
echo ""

# Step 1: 拉取最新代码
if [ "$NO_PULL" = "false" ]; then
    log_step "1. 拉取最新代码..."
    
    # 保存当前 commit
    before_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    git pull --rebase
    
    after_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    if [ "$before_commit" != "$after_commit" ]; then
        log_info "代码已更新: ${before_commit:0:8} -> ${after_commit:0:8}"
    else
        log_info "代码已是最新"
    fi
else
    log_step "1. 跳过代码拉取"
fi

# Step 2: 前端构建
if [ "$SKIP_FRONTEND" = "false" ]; then
    log_step "2. 前端构建..."
    
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
    log_step "2. 跳过前端构建"
fi

# Step 3: 后端更新
log_step "3. 后端更新..."

# 过滤参数，传递给 docker/update.sh
# 注意：始终添加 --no-pull，因为这里已经拉取过代码了
BACKEND_ARGS=("--no-pull")
for arg in "$@"; do
    if [ "$arg" != "--skip-frontend" ] && [ "$arg" != "--no-pull" ]; then
        BACKEND_ARGS+=("$arg")
    fi
done

./docker/update.sh "${BACKEND_ARGS[@]}"

echo ""
log_info "✅ 生产环境更新完成!"
