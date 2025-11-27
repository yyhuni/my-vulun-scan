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
BACKEND_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
PROJECT_ROOT="$( cd "$BACKEND_DIR/.." && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"
LOG_DIR="${LOG_DIR:-$BACKEND_DIR/logs}"

echo -e "${BLUE}=============================="
echo -e "  XingRin 测试环境重启"
echo -e "  （强制重启所有服务）"
echo -e "==============================${NC}"
echo ""

# 1. 强制停止所有服务
echo -e "${YELLOW}[1/4] 停止所有服务...${NC}"
echo ""

# 停止其他服务（包括 Prefect Server 和 Workers）
if [ -f "$SCRIPT_DIR/stop.sh" ]; then
    "$SCRIPT_DIR/stop.sh" || true
fi

echo ""
echo -e "${YELLOW}[2/4] 清理进程、日志和缓存...${NC}"

# 清理可能残留的 Python 进程
echo "清理残留进程..."
pkill -f "manage.py runserver" 2>/dev/null || true
pkill -f "initiate_scan_deployment" 2>/dev/null || true
pkill -f "cleanup_deployment" 2>/dev/null || true

# 清理服务启动日志（PID 目录下的日志）
echo "清理服务启动日志..."
if [ -d "$PID_DIR" ]; then
    LOG_COUNT=$(find "$PID_DIR" -type f -name "*.log" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$LOG_COUNT" -gt 0 ]; then
        rm -f "$PID_DIR"/*.log 2>/dev/null || true
        echo -e "${GREEN}✓ 已清理 $LOG_COUNT 个服务日志文件 ($PID_DIR)${NC}"
    fi
    # 清理 PID 文件
    rm -rf "$PID_DIR"
    echo -e "${GREEN}✓ PID 文件已清理${NC}"
fi

# 清理应用业务日志（避免旧日志干扰排查）
echo "清理应用业务日志..."
if [ -d "$LOG_DIR" ]; then
    LOG_FILES=$(find "$LOG_DIR" -type f -name "*.log" ! -name ".gitkeep" 2>/dev/null)
    if [ -n "$LOG_FILES" ]; then
        LOG_COUNT=$(echo "$LOG_FILES" | wc -l | tr -d ' ')
        echo "$LOG_FILES" | while read -r log_file; do
            FILE_SIZE=$(du -h "$log_file" 2>/dev/null | cut -f1)
            FILE_NAME=$(basename "$log_file")
            echo "  - 清理: $FILE_NAME ($FILE_SIZE)"
            > "$log_file"  # 清空文件内容，保留文件
        done
        echo -e "${GREEN}✓ 已清理 $LOG_COUNT 个业务日志文件 ($LOG_DIR)${NC}"
    else
        echo -e "${GREEN}✓ 业务日志已是干净状态${NC}"
    fi
fi

# 清理 Python 缓存（可选，但有助于确保代码更新）
echo "清理 Python 缓存..."
find "$BACKEND_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR" -type f -name "*.pyc" -delete 2>/dev/null || true
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
echo "  - 查看状态: ./scripts/dev/status.sh"
echo "  - 查看服务日志: tail -f $PID_DIR/*.log"
echo "  - 查看业务日志: tail -f $LOG_DIR/xingrin.log"
echo "  - 所有日志已清空，可以开始新的调试"
echo ""
