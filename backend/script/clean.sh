#!/bin/bash

################################################################################
# XingRin 清理脚本
# 
# 清理运行时文件和旧的数据库文件
################################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="$HOME/Desktop/scanner/backend"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  XingRin 清理脚本${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

cd "$PROJECT_DIR" || exit 1

echo -e "${YELLOW}正在清理运行时文件...${NC}"
echo ""

# 清理旧的运行时文件（项目根目录下的）
if [ -f "celerybeat-schedule" ]; then
    echo -e "删除: ${RED}celerybeat-schedule${NC}"
    rm -f celerybeat-schedule celerybeat-schedule-* 2>/dev/null
fi

if [ -f "flower.db" ]; then
    echo -e "删除: ${RED}flower.db${NC}"
    rm -f flower.db 2>/dev/null
fi

if [ -d "pids" ]; then
    echo -e "删除: ${RED}pids/${NC}"
    rm -rf pids 2>/dev/null
fi

if [ -d "logs" ] && [ ! -d "var/logs" ]; then
    echo -e "移动: ${YELLOW}logs/ -> var/logs/${NC}"
    mkdir -p var
    mv logs var/logs 2>/dev/null
fi

# 清理 Python 缓存
echo ""
echo -e "${YELLOW}清理 Python 缓存...${NC}"
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type f -name "*.pyc" -delete 2>/dev/null
find . -type f -name "*.pyo" -delete 2>/dev/null

echo ""
echo -e "${GREEN}✅ 清理完成！${NC}"
echo ""
echo -e "${BLUE}新的目录结构：${NC}"
echo -e "  var/"
echo -e "  ├── logs/    # 日志文件"
echo -e "  ├── run/     # PID 文件"
echo -e "  └── db/      # 数据库文件"
echo ""
