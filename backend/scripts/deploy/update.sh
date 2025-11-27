#!/bin/bash
# ============================================
# XingRin 代码更新脚本
# 用途：更新代码（git pull）
# 适用：主机 & Worker VPS
# ============================================

set -e

# 配置
MARKER_DIR="/opt/xingrin"
SRC_DIR="${MARKER_DIR}/src"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

# 检查代码目录
if [ ! -d "${SRC_DIR}/.git" ]; then
    log_error "未找到项目代码，请先运行 install.sh"
    exit 1
fi

log_info "=========================================="
log_info "  XingRin 代码更新"
log_info "=========================================="

cd "${SRC_DIR}"

# 显示当前状态
BRANCH=$(git branch --show-current)
OLD_COMMIT=$(git rev-parse --short HEAD)
log_info "当前分支: $BRANCH"
log_info "当前版本: $OLD_COMMIT"

# 拉取更新
log_info "拉取最新代码..."
git fetch origin
git pull origin "$BRANCH"

NEW_COMMIT=$(git rev-parse --short HEAD)

if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
    log_success "代码已更新: $OLD_COMMIT -> $NEW_COMMIT"
    echo ""
    log_info "更新内容:"
    git log --oneline ${OLD_COMMIT}..${NEW_COMMIT} | head -10
else
    log_info "代码已是最新版本"
fi

echo ""
log_info "=========================================="
log_info "注意: 代码更新后 Worker 会自动加载新代码"
log_info "如需重启服务，请运行对应的启动脚本"
log_info "=========================================="
