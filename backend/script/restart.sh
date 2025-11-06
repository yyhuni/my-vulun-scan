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
echo -e "${YELLOW}步骤 1/3: 停止所有服务...${NC}"
echo ""
bash "$SCRIPT_DIR/stop.sh"

# 步骤 2: 等待服务完全停止
echo -e "${YELLOW}步骤 2/3: 等待服务完全停止...${NC}"
sleep 3
echo -e "${GREEN}   ✅ 等待完成${NC}"
echo ""

# 步骤 3: 重新启动所有服务
echo -e "${YELLOW}步骤 3/3: 重新启动所有服务...${NC}"
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
