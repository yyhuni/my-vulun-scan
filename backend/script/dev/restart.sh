#!/bin/bash
# XingRin 开发环境重启脚本（测试环境）
#
# 功能：
# - 强制重启所有服务（包括 Prefect Server 和 Worker）
# - 确保代码更改生效
# - 清理所有进程和 PID 文件

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"

echo -e "${BLUE}=============================="
echo -e "  XingRin 测试环境重启"
echo -e "  （强制重启所有服务）"
echo -e "==============================${NC}"
echo ""

# 1. 强制停止所有服务
echo -e "${YELLOW}[1/4] 停止所有服务...${NC}"
echo ""

# 停止 Prefect Worker（使用 pkill）
echo "停止 Prefect Worker..."
if pkill -f "prefect worker" 2>/dev/null; then
    echo -e "${GREEN}✓ Prefect Worker 已停止${NC}"
else
    echo -e "${YELLOW}⚠ Prefect Worker 未运行${NC}"
fi

# 停止其他服务
if [ -f "$SCRIPT_DIR/stop.sh" ]; then
    # 使用 yes 自动回答 "y" 来停止 Prefect Server
    yes | "$SCRIPT_DIR/stop.sh" 2>/dev/null || true
fi

echo ""
echo -e "${YELLOW}[2/4] 清理进程和缓存...${NC}"

# 清理可能残留的 Python 进程
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "initiate_scan_deployment" 2>/dev/null || true
pkill -f "cleanup_deployment" 2>/dev/null || true

# 清理 PID 目录
if [ -d "$PID_DIR" ]; then
    rm -rf "$PID_DIR"
    echo -e "${GREEN}✓ PID 文件已清理${NC}"
fi

# 清理 Python 缓存（可选，但有助于确保代码更新）
echo "清理 Python 缓存..."
find "$SCRIPT_DIR/../.." -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$SCRIPT_DIR/../.." -type f -name "*.pyc" -delete 2>/dev/null || true
echo -e "${GREEN}✓ Python 缓存已清理${NC}"

echo ""
echo -e "${YELLOW}[3/4] 等待进程完全退出...${NC}"
sleep 3

echo ""
echo -e "${YELLOW}[4/4] 启动所有服务...${NC}"
echo ""

# 2. 重新启动所有服务
if [ -f "$SCRIPT_DIR/start.sh" ]; then
    "$SCRIPT_DIR/start.sh"
else
    echo -e "${RED}✗ start.sh 不存在${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=============================="
echo -e "  ✓ 测试环境重启完成"
echo -e "==============================${NC}"
echo ""
echo -e "${BLUE}提示：${NC}"
echo "  - 查看状态: ./script/dev/status.sh"
echo "  - 查看日志: tail -f $PID_DIR/*.log"
echo ""
