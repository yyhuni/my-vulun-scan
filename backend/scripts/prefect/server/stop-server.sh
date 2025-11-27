#!/bin/bash
# Prefect Server 停止脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"

# PID文件放在 PID_DIR
PID_FILE="$PID_DIR/prefect-server.pid"

echo "🛑 Prefect Server 停止脚本"
echo "========================="

# 函数：停止服务
stop_service() {
    local service_name=$1
    local pid_pattern=$2
    local pid_file=$3
    
    echo "停止 $service_name..."
    
    # 通过进程名查找并停止
    if pgrep -f "$pid_pattern" > /dev/null 2>&1; then
        echo "  发现 $service_name 进程，正在停止..."
        pkill -f "$pid_pattern" 2>/dev/null || true
        sleep 2
        
        # 强制停止（如果需要）
        if pgrep -f "$pid_pattern" > /dev/null 2>&1; then
            echo "  强制停止 $service_name..."
            pkill -9 -f "$pid_pattern" 2>/dev/null || true
            sleep 1
        fi
        
        echo -e "${GREEN}✓ $service_name 已停止${NC}"
    else
        echo -e "${YELLOW}⚠ $service_name 未运行${NC}"
    fi
    
    # 清理 PID 文件
    if [ -f "$pid_file" ]; then
        rm -f "$pid_file"
    fi
}

# 停止 Prefect Server
stop_service "Prefect Server" "prefect server start" "$PID_FILE"

echo ""
echo -e "${GREEN}✓ Prefect Server 停止完成${NC}"
