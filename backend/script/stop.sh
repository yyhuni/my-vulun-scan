#!/bin/bash

################################################################################
# XingRin 后端服务停止脚本 (Prefect 版本)
# 
# 停止以下服务：
# 1. Django 开发服务器
# 2. Prefect Server
# 3. Prefect Worker
################################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="$HOME/Desktop/scanner/backend"
PID_DIR="$PROJECT_DIR/var/run"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  XingRin 后端服务停止脚本${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 按 PID 文件停止服务
stop_service_by_pid() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}正在停止 $service_name (PID: $pid)...${NC}"
            kill "$pid" 2>/dev/null
            sleep 1
            
            # 检查是否成功停止
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}   ⚠️  进程未响应，强制停止...${NC}"
                kill -9 "$pid" 2>/dev/null
                sleep 1
            fi
            
            if ! ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${GREEN}   ✅ $service_name 已停止${NC}"
            fi
        fi
        rm -f "$pid_file"
    fi
}

# 按进程名强制停止（清理残留进程）
kill_by_process_name() {
    local process_pattern=$1
    local service_name=$2
    
    local pids=$(pgrep -f "$process_pattern" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${YELLOW}发现残留的 $service_name 进程，正在清理...${NC}"
        echo "$pids" | while read pid; do
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${YELLOW}   停止进程 PID: $pid${NC}"
                kill "$pid" 2>/dev/null
                sleep 0.5
                if ps -p "$pid" > /dev/null 2>&1; then
                    kill -9 "$pid" 2>/dev/null
                fi
            fi
        done
        echo -e "${GREEN}   ✅ 残留进程已清理${NC}"
    fi
}

# 按端口号停止（清理端口占用）
kill_by_port() {
    local port=$1
    local service_name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}端口 $port 被占用 ($service_name)，正在清理...${NC}"
        echo "$pid" | while read p; do
            echo -e "${YELLOW}   停止占用端口的进程 PID: $p${NC}"
            kill "$p" 2>/dev/null
            sleep 0.5
            if ps -p "$p" > /dev/null 2>&1; then
                kill -9 "$p" 2>/dev/null
            fi
        done
        echo -e "${GREEN}   ✅ 端口 $port 已释放${NC}"
    fi
}

# 1. 先按 PID 文件停止
echo -e "${BLUE}[阶段 1/2] 停止已知服务...${NC}"
stop_service_by_pid "Django" "$PID_DIR/django.pid"
stop_service_by_pid "Prefect Server" "$PID_DIR/prefect_server.pid"
stop_service_by_pid "Prefect Worker" "$PID_DIR/prefect_worker.pid"

echo ""
echo -e "${BLUE}[阶段 2/2] 清理残留进程和端口占用...${NC}"

# 2. 按端口清理（确保端口释放）
kill_by_port 8888 "Django"
kill_by_port 4200 "Prefect"

# 3. 按进程名清理残留进程
kill_by_process_name "manage.py runserver" "Django"
kill_by_process_name "prefect server" "Prefect Server"
kill_by_process_name "prefect worker" "Prefect Worker"

# 清理所有 PID 文件
rm -f "$PID_DIR"/*.pid 2>/dev/null

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ 所有服务已停止，端口已释放${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
