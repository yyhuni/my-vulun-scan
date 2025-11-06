#!/bin/bash

################################################################################
# XingRin 后端服务停止脚本
# 
# 停止以下服务：
# 1. Django 开发服务器
# 2. Celery Worker - orchestrator 队列
# 3. Celery Worker - scans 队列
# 4. Celery Beat
# 5. Flower
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

# 停止服务的函数
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}正在停止 $service_name (PID: $pid)...${NC}"
            kill "$pid"
            sleep 2
            
            # 检查是否成功停止
            if ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${RED}   ⚠️  进程未响应，强制停止...${NC}"
                kill -9 "$pid"
                sleep 1
            fi
            
            if ! ps -p "$pid" > /dev/null 2>&1; then
                echo -e "${GREEN}   ✅ $service_name 已停止${NC}"
                rm -f "$pid_file"
            else
                echo -e "${RED}   ❌ $service_name 停止失败${NC}"
            fi
        else
            echo -e "${YELLOW}$service_name 未运行 (PID 文件存在但进程不存在)${NC}"
            rm -f "$pid_file"
        fi
    else
        echo -e "${YELLOW}$service_name 未运行 (无 PID 文件)${NC}"
    fi
}

# 停止各项服务
stop_service "Django" "$PID_DIR/django.pid"
stop_service "Celery Worker - orchestrator" "$PID_DIR/celery_orchestrator.pid"
stop_service "Celery Worker - scans" "$PID_DIR/celery_scans.pid"
stop_service "Celery Beat" "$PID_DIR/celery_beat.pid"
stop_service "Flower" "$PID_DIR/flower.pid"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ 所有服务已停止${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
