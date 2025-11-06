#!/bin/bash

################################################################################
# XingRin 后端服务状态检查脚本
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
echo -e "${BLUE}  XingRin 后端服务状态${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 检查服务状态的函数
check_service() {
    local service_name=$1
    local pid_file=$2
    local port=$3
    
    printf "%-30s" "$service_name:"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}运行中${NC} (PID: $pid)"
            if [ ! -z "$port" ]; then
                if lsof -i:$port > /dev/null 2>&1; then
                    echo -e "  └─ 端口 $port: ${GREEN}监听中${NC}"
                else
                    echo -e "  └─ 端口 $port: ${RED}未监听${NC}"
                fi
            fi
        else
            echo -e "${RED}已停止${NC} (PID 文件存在但进程不存在)"
        fi
    else
        echo -e "${RED}已停止${NC}"
    fi
}

# 检查 Redis (Docker 容器)
printf "%-30s" "Redis (Docker):"
if docker ps --filter "name=vulun-redis" --filter "status=running" --format "{{.Names}}" | grep -q "vulun-redis"; then
    echo -e "${GREEN}运行中${NC} (容器: vulun-redis)"
else
    echo -e "${RED}未运行${NC}"
fi

echo ""

# 检查各项服务
check_service "Django 开发服务器" "$PID_DIR/django.pid" "8888"
check_service "Celery Worker - orchestrator" "$PID_DIR/celery_orchestrator.pid"
check_service "Celery Worker - scans" "$PID_DIR/celery_scans.pid"
check_service "Celery Beat" "$PID_DIR/celery_beat.pid"
check_service "Flower 监控" "$PID_DIR/flower.pid" "5555"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${YELLOW}快速访问：${NC}"
echo -e "  • Django API:     ${GREEN}http://localhost:8888${NC}"
echo -e "  • API 文档:       ${GREEN}http://localhost:8888/swagger/${NC}"
echo -e "  • Flower 监控:    ${GREEN}http://localhost:5555${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
