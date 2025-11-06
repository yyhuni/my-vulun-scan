#!/bin/bash

################################################################################
# XingRin 后端服务诊断脚本
# 
# 检查：
# 1. 端口占用情况
# 2. 进程运行状态
# 3. PID 文件状态
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
echo -e "${BLUE}  XingRin 后端服务诊断${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查端口占用
echo -e "${BLUE}[1/3] 端口占用情况${NC}"
echo ""

check_port() {
    local port=$1
    local service_name=$2
    
    local pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        local cmd=$(ps -p $pid -o comm= 2>/dev/null)
        echo -e "${GREEN}✅ 端口 $port ($service_name)${NC}"
        echo -e "   进程 PID: $pid"
        echo -e "   命令: $cmd"
    else
        echo -e "${YELLOW}⚪ 端口 $port ($service_name) - 未占用${NC}"
    fi
}

check_port 8888 "Django"
check_port 5555 "Flower"

echo ""
echo -e "${BLUE}[2/3] 进程运行状态${NC}"
echo ""

check_process() {
    local pattern=$1
    local service_name=$2
    
    local pids=$(pgrep -f "$pattern" 2>/dev/null)
    if [ -n "$pids" ]; then
        echo -e "${GREEN}✅ $service_name 运行中${NC}"
        echo "$pids" | while read pid; do
            local cmd=$(ps -p $pid -o args= 2>/dev/null | head -c 100)
            echo -e "   PID: $pid - $cmd..."
        done
    else
        echo -e "${YELLOW}⚪ $service_name - 未运行${NC}"
    fi
}

check_process "manage.py runserver" "Django"
check_process "celery.*worker.*orchestrator" "Celery Worker - orchestrator"
check_process "celery.*worker.*scans" "Celery Worker - scans"
check_process "celery.*beat" "Celery Beat"
check_process "celery.*flower" "Flower"

echo ""
echo -e "${BLUE}[3/3] PID 文件状态${NC}"
echo ""

check_pid_file() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name${NC}"
            echo -e "   PID 文件: $pid_file"
            echo -e "   PID: $pid (运行中)"
        else
            echo -e "${RED}⚠️  $service_name${NC}"
            echo -e "   PID 文件: $pid_file"
            echo -e "   PID: $pid (进程不存在 - 僵尸文件)${NC}"
        fi
    else
        echo -e "${YELLOW}⚪ $service_name - 无 PID 文件${NC}"
    fi
}

check_pid_file "Django" "$PID_DIR/django.pid"
check_pid_file "Celery Worker - orchestrator" "$PID_DIR/celery_orchestrator.pid"
check_pid_file "Celery Worker - scans" "$PID_DIR/celery_scans.pid"
check_pid_file "Celery Beat" "$PID_DIR/celery_beat.pid"
check_pid_file "Flower" "$PID_DIR/flower.pid"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}快捷操作：${NC}"
echo -e "  启动服务: ${BLUE}bash script/start.sh${NC}"
echo -e "  停止服务: ${BLUE}bash script/stop.sh${NC}"
echo -e "  重启服务: ${BLUE}bash script/restart.sh${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
