#!/bin/bash
# Prefect Server 启动脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../../.." && pwd )"
PROJECT_ROOT="$( cd "$BACKEND_DIR/.." && pwd )"

# PID 文件放在 .pids 目录，日志放在 backend/logs/prefect/
LOG_DIR="$BACKEND_DIR/logs/prefect"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/server.log"
PID_FILE="$PID_DIR/prefect-server.pid"

# 创建 PID 目录
mkdir -p "$PID_DIR"

echo "🚀 Prefect Server 启动脚本"
echo "=========================="

# 检查是否已经运行
PREFECT_PID=$(pgrep -f "prefect server start" 2>/dev/null || echo "")

if [ -n "$PREFECT_PID" ]; then
    echo -e "${YELLOW}⚠ Prefect Server 已在运行 (PID: $PREFECT_PID)${NC}"
    echo "  访问: http://localhost:4200"
    exit 0
fi

echo "启动 Prefect Server..."

# 切换到 backend 目录（重要：确保读取 .env 文件）
cd "$BACKEND_DIR"

# 启动 Prefect Server（后台）
nohup $PROJECT_ROOT/.venv/bin/prefect server start > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

echo "等待 Prefect Server 启动..."

# 等待服务完全启动（5秒）
sleep 5

# 验证启动
if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prefect Server 已启动 (PID: $NEW_PID)${NC}"
    echo "  访问: http://localhost:4200"
    echo "  日志: tail -f $LOG_FILE"
else
    echo -e "${RED}❌ Prefect Server 启动失败${NC}"
    echo "  查看日志: tail -f $LOG_FILE"
    exit 1
fi
