#!/bin/bash
# Prefect Server 状态检查脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "📊 Prefect Server 状态检查"
echo "========================="

# 检查进程状态
PREFECT_PID=$(pgrep -f "prefect server start" 2>/dev/null || echo "")

if [ -n "$PREFECT_PID" ]; then
    echo -e "${GREEN}✓ Prefect Server 正在运行${NC}"
    echo "  进程 ID: $PREFECT_PID"
    
    # 检查 API 健康状态
    if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ API 健康检查通过${NC}"
        echo "  访问地址: http://localhost:4200"
        
        # 获取 Prefect 版本信息
        VERSION=$(curl -s http://localhost:4200/api/admin/version 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "未知")
        echo "  Prefect 版本: $VERSION"
    else
        echo -e "  ${YELLOW}⚠ API 健康检查失败${NC}"
        echo "  服务可能正在启动中..."
    fi
    
    # 显示内存使用情况
    if command -v ps > /dev/null 2>&1; then
        MEMORY=$(ps -p $PREFECT_PID -o rss= 2>/dev/null | awk '{print int($1/1024)"MB"}' || echo "未知")
        echo "  内存使用: $MEMORY"
    fi
    
else
    echo -e "${RED}❌ Prefect Server 未运行${NC}"
    echo ""
    echo "启动命令:"
    echo "  ./scripts/prefect/server/start-server.sh"
    echo "  或者:"
    echo "  ./scripts/prefect/prefect.sh server start"
fi

# 检查端口占用
echo ""
echo "端口状态:"
if lsof -i :4200 > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ 端口 4200 已被占用${NC}"
    PROCESS=$(lsof -i :4200 -t 2>/dev/null | head -1)
    if [ -n "$PROCESS" ]; then
        PROCESS_NAME=$(ps -p $PROCESS -o comm= 2>/dev/null || echo "未知")
        echo "  占用进程: $PROCESS_NAME (PID: $PROCESS)"
    fi
else
    echo -e "  ${YELLOW}⚠ 端口 4200 空闲${NC}"
fi

# 检查日志文件
echo ""
echo "日志文件:"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 日志文件放在当前脚本目录
LOG_FILE="$SCRIPT_DIR/prefect-server.log"

if [ -f "$LOG_FILE" ]; then
    echo "  日志位置: $LOG_FILE"
    echo "  文件大小: $(du -h "$LOG_FILE" | cut -f1)"
    echo "  查看日志: tail -f $LOG_FILE"
    
    # 显示最近的错误（如果有）
    if grep -i "error\|exception\|failed" "$LOG_FILE" | tail -1 > /dev/null 2>&1; then
        echo ""
        echo -e "${YELLOW}最近的错误:${NC}"
        grep -i "error\|exception\|failed" "$LOG_FILE" | tail -1 | sed 's/^/  /'
    fi
else
    echo -e "  ${YELLOW}⚠ 日志文件不存在${NC}"
fi

echo ""
echo "🔗 相关链接:"
echo "  Prefect UI: http://localhost:4200"
echo "  API 文档: http://localhost:4200/docs"
echo "  健康检查: http://localhost:4200/api/health"
