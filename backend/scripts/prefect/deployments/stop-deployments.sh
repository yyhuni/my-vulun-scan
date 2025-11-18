#!/bin/bash
# Prefect Deployments 停止脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🛑 Prefect Deployments 停止脚本"
echo "================================="

# 函数：停止单个服务
stop_deployment() {
    local name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "  - 停止 $name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # 强制停止（如果需要）
            if ps -p $pid > /dev/null 2>&1; then
                echo "    强制停止..."
                kill -9 $pid 2>/dev/null || true
            fi
            
            echo -e "${GREEN}    ✓ $name 已停止${NC}"
        else
            echo -e "${YELLOW}    ⚠ $name 未运行${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "${YELLOW}    ⚠ $name PID 文件不存在${NC}"
    fi
}

echo ""
echo "停止所有 Prefect Deployments..."

# 停止所有 Deployments
stop_deployment "扫描任务" "$SCRIPT_DIR/scan-deployment.pid"
stop_deployment "清理任务" "$SCRIPT_DIR/cleanup-deployment.pid"
stop_deployment "删除任务" "$SCRIPT_DIR/delete-deployment.pid"

echo ""
echo -e "${GREEN}✓ 所有 Deployments 已停止${NC}"
