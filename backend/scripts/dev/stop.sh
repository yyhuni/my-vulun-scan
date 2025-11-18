#!/bin/bash
# XingRin 开发环境停止脚本
#
# 功能：停止所有开发服务

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"

echo -e "${BLUE}=============================="
echo -e "  XingRin 开发环境停止"
echo -e "==============================${NC}"
echo ""

# 检查 PID 目录是否存在
if [ ! -d "$PID_DIR" ]; then
    echo -e "${YELLOW}⚠ 没有找到运行中的服务${NC}"
    exit 0
fi

# 停止函数
stop_service() {
    local service_name=$1
    local pid_file="$PID_DIR/$2.pid"
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo "停止 $service_name (PID: $PID)..."
            kill $PID 2>/dev/null || true
            
            # 等待进程结束
            for i in {1..10}; do
                if ! ps -p $PID > /dev/null 2>&1; then
                    break
                fi
                sleep 0.5
            done
            
            # 如果还没停止，强制结束
            if ps -p $PID > /dev/null 2>&1; then
                echo "  强制停止..."
                kill -9 $PID 2>/dev/null || true
            fi
            
            echo -e "${GREEN}✓ $service_name 已停止${NC}"
        else
            echo -e "${YELLOW}⚠ $service_name 未运行${NC}"
        fi
        rm "$pid_file"
    else
        echo -e "${YELLOW}⚠ $service_name PID 文件不存在${NC}"
    fi
}

# 1. 停止 Prefect Deployments
echo "停止 Prefect Deployments..."
stop_service "扫描任务 Deployment" "scan-deployment"
stop_service "清理任务 Deployment" "cleanup-deployment"
echo -e "${YELLOW}⚠ 删除任务 Deployment 未运行${NC}"

# 2. 停止 Daphne ASGI 服务器
echo ""
echo "停止 Daphne ASGI 服务器..."
stop_service "Daphne" "daphne"

# 额外检查：确保端口 8888 被释放
if lsof -ti:8888 > /dev/null 2>&1; then
    echo "  发现端口 8888 仍被占用，强制释放..."
    kill $(lsof -ti:8888) 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ 端口 8888 已释放${NC}"
fi

# 3. 停止 Prefect Worker
echo ""
echo "停止 Prefect Worker..."
stop_service "Prefect Worker" "prefect-worker"

# 4. 停止 Prefect Server
echo ""
echo "停止 Prefect Server..."
stop_service "Prefect Server" "prefect-server"

# 额外检查：清理任何残留的 Prefect Server 进程
if pgrep -f "prefect server start" > /dev/null 2>&1; then
    echo "  发现残留的 Prefect Server 进程，正在清理..."
    pkill -f "prefect server start" 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✓ Prefect Server 残留进程已清理${NC}"
fi

# 5. 清理空的 PID 目录（如果所有服务都停止了）
if [ -z "$(ls -A $PID_DIR/*.pid 2>/dev/null)" ]; then
    echo ""
    echo "清理 PID 目录..."
    rm -rf "$PID_DIR"
fi

echo ""
echo -e "${GREEN}=============================="
echo -e "  ✓ 服务已停止"
echo -e "==============================${NC}"
echo ""
