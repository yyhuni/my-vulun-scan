#!/bin/bash
# ============================================
# XingRin 状态检查脚本
# 用途：检查服务状态
# 适用：主机 & Worker VPS
# ============================================

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

# 检测 Docker 命令
if docker info >/dev/null 2>&1; then
    DOCKER_CMD="docker"
else
    DOCKER_CMD="sudo docker"
fi

echo ""
log_info "=========================================="
log_info "  XingRin 状态检查"
log_info "=========================================="

# 检查 Docker
echo ""
echo "Docker 状态:"
if command -v docker &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Docker 已安装: $(docker --version 2>/dev/null | head -1)"
else
    echo -e "  ${RED}✗${NC} Docker 未安装"
fi

# 检查镜像
echo ""
echo "Docker 镜像:"
if $DOCKER_CMD images xingrin-worker:latest --format "{{.ID}}" 2>/dev/null | grep -q .; then
    SIZE=$($DOCKER_CMD images xingrin-worker:latest --format "{{.Size}}" 2>/dev/null)
    echo -e "  ${GREEN}✓${NC} xingrin-worker:latest ($SIZE)"
else
    echo -e "  ${YELLOW}⚠${NC} xingrin-worker:latest 未构建"
fi

# 检查容器
echo ""
echo "Docker 容器:"
if $DOCKER_CMD ps | grep -q xingrin-worker; then
    STATUS=$($DOCKER_CMD ps --filter "name=xingrin-worker" --format "{{.Status}}" 2>/dev/null)
    echo -e "  ${GREEN}✓${NC} xingrin-worker: $STATUS"
else
    echo -e "  ${YELLOW}⚠${NC} xingrin-worker: 未运行"
fi

# 检查代码
echo ""
echo "项目代码:"
if [ -d "${SRC_DIR}/.git" ]; then
    cd "${SRC_DIR}"
    BRANCH=$(git branch --show-current 2>/dev/null)
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
    echo -e "  ${GREEN}✓${NC} 位置: ${SRC_DIR}"
    echo -e "  ${GREEN}✓${NC} 分支: $BRANCH ($COMMIT)"
else
    echo -e "  ${YELLOW}⚠${NC} 未克隆"
fi

# 检查 Prefect Server（如果是主机）
echo ""
echo "Prefect Server:"
if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} 运行中 (http://localhost:4200)"
else
    echo -e "  ${YELLOW}⚠${NC} 未运行或不可达"
fi

# 检查 Django（如果是主机）
echo ""
echo "Django 后端:"
if curl -s http://localhost:8888/api/health/ > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} 运行中 (http://localhost:8888)"
else
    echo -e "  ${YELLOW}⚠${NC} 未运行或不可达"
fi

echo ""
log_info "=========================================="
