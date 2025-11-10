#!/bin/bash
# XingRin 开发环境重启脚本
#
# 功能：重启所有开发服务

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${BLUE}=============================="
echo -e "  XingRin 开发环境重启"
echo -e "==============================${NC}"
echo ""

# 1. 停止所有服务（自动回答不停止 Prefect Server）
echo "正在停止服务..."
echo "N" | "$SCRIPT_DIR/stop.sh"

echo ""
echo "等待 3 秒..."
sleep 3

# 2. 重新启动所有服务
echo ""
echo "正在启动服务..."
"$SCRIPT_DIR/start.sh"

echo ""
echo -e "${GREEN}=============================="
echo -e "  ✓ 重启完成"
echo -e "==============================${NC}"
echo ""
