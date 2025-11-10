#!/bin/bash
# XingRin 开发环境状态查看脚本
#
# 功能：查看所有服务的运行状态

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"

echo -e "${BLUE}=============================="
echo -e "  XingRin 开发环境状态"
echo -e "==============================${NC}"
echo ""

# 检查服务状态
check_service() {
    local service_name=$1
    local pid_file="$PID_DIR/$2.pid"
    local url=$3
    
    printf "%-25s" "$service_name:"
    
    if [ -f "$pid_file" ]; then
        PID=$(cat "$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo -e "${GREEN}运行中${NC} (PID: $PID)"
            
            # 如果提供了 URL，检查服务是否响应
            if [ -n "$url" ]; then
                if curl -s "$url" > /dev/null 2>&1; then
                    echo "                           └─ 访问: $url"
                else
                    echo -e "                           └─ ${YELLOW}⚠ 服务未响应${NC}"
                fi
            fi
        else
            echo -e "${RED}已停止${NC} (PID 文件存在但进程不存在)"
        fi
    else
        echo -e "${RED}已停止${NC}"
    fi
}

# 检查各个服务
check_service "Prefect Server" "prefect-server" "http://localhost:4200/api/health"
echo ""
check_service "Django" "django" "http://localhost:8888"
echo ""
check_service "扫描任务 Deployment" "scan-deployment"
check_service "清理任务 Deployment" "cleanup-deployment"

# 显示日志文件位置
echo ""
echo -e "${BLUE}日志文件:${NC}"
if [ -d "$PID_DIR" ]; then
    for log_file in "$PID_DIR"/*.log; do
        if [ -f "$log_file" ]; then
            filename=$(basename "$log_file")
            size=$(du -h "$log_file" | cut -f1)
            echo "  - $filename ($size)"
        fi
    done
else
    echo "  (无日志文件)"
fi

echo ""
echo -e "${BLUE}管理命令:${NC}"
echo "  - 查看日志: tail -f $PID_DIR/<服务名>.log"
echo "  - 重启服务: ./script/dev/restart.sh"
echo "  - 停止服务: ./script/dev/stop.sh"
echo ""
