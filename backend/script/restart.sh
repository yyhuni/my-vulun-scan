#!/bin/bash

################################################################################
# XingRin 后端服务重启脚本
# 
# 功能：
# 1. 停止所有服务
# 2. 等待服务完全停止
# 3. 重新启动所有服务
################################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  XingRin 后端服务重启脚本${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 步骤 1: 停止所有服务
echo -e "${YELLOW}步骤 1/4: 停止所有服务...${NC}"
echo ""
bash "$SCRIPT_DIR/stop.sh"

# 步骤 2: 等待服务完全停止并验证
echo -e "${YELLOW}步骤 2/4: 等待服务完全停止...${NC}"
sleep 2

# 验证端口是否已释放
max_wait=10
waited=0
while [ $waited -lt $max_wait ]; do
    port_occupied=false
    
    if lsof -ti:8888 > /dev/null 2>&1; then
        port_occupied=true
    fi
    
    if lsof -ti:5555 > /dev/null 2>&1; then
        port_occupied=true
    fi
    
    if [ "$port_occupied" = false ]; then
        echo -e "${GREEN}   ✅ 所有端口已释放${NC}"
        break
    fi
    
    echo -e "${YELLOW}   等待端口释放... ($waited/$max_wait 秒)${NC}"
    sleep 1
    waited=$((waited + 1))
done

if [ $waited -ge $max_wait ]; then
    echo -e "${RED}   ⚠️  端口仍被占用，可能需要手动检查${NC}"
fi

echo ""

# 步骤 3: 清理旧日志（可选）
echo -e "${YELLOW}步骤 3/4: 清理旧日志文件...${NC}"
LOG_DIR="$HOME/Desktop/scanner/backend/var/logs"
if [ -d "$LOG_DIR" ]; then
    # 备份重要日志到 old/ 目录
    mkdir -p "$LOG_DIR/old"
    if [ -f "$LOG_DIR/django.log" ]; then
        mv "$LOG_DIR/django.log" "$LOG_DIR/old/django_$(date +%Y%m%d_%H%M%S).log" 2>/dev/null
    fi
    if [ -f "$LOG_DIR/flower.log" ]; then
        mv "$LOG_DIR/flower.log" "$LOG_DIR/old/flower_$(date +%Y%m%d_%H%M%S).log" 2>/dev/null
    fi
    echo -e "${GREEN}   ✅ 旧日志已备份${NC}"
else
    echo -e "${YELLOW}   跳过日志清理（目录不存在）${NC}"
fi
echo ""

# 步骤 4: 重新启动所有服务
echo -e "${YELLOW}步骤 4/4: 重新启动所有服务...${NC}"
echo ""
bash "$SCRIPT_DIR/start.sh"

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ 服务重启完成！${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}快速访问：${NC}"
echo -e "  • Django API:     ${GREEN}http://localhost:8888${NC}"
echo -e "  • API 文档:       ${GREEN}http://localhost:8888/api/swagger/${NC}"
echo -e "  • Flower 监控:    ${GREEN}http://localhost:5555${NC}"
echo ""
echo -e "${YELLOW}查看状态：${NC}"
echo -e "  bash script/status.sh"
echo ""
