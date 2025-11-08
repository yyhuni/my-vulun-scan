#!/bin/bash

################################################################################
# XingRin 后端服务启动脚本 (Prefect 版本)
# 
# 启动以下服务：
# 1. Django 开发服务器 (端口 8888)
# 2. Prefect Server (端口 4200)
# 3. Prefect Worker (默认工作池)
################################################################################

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="$HOME/Desktop/scanner/backend"
VENV_PYTHON="$HOME/Desktop/scanner/.venv/bin/python"
VENV_PREFECT="$HOME/Desktop/scanner/.venv/bin/prefect"

# 运行时目录
VAR_DIR="$PROJECT_DIR/var"
LOG_DIR="$VAR_DIR/logs"
PID_DIR="$VAR_DIR/run"
DB_DIR="$VAR_DIR/db"

# 创建必要的目录
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"
mkdir -p "$DB_DIR"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  XingRin 后端服务启动脚本${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# 切换到项目目录
cd "$PROJECT_DIR" || exit 1

# 检查虚拟环境
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${RED}❌ 虚拟环境不存在: $VENV_PYTHON${NC}"
    exit 1
fi

# 检查 PostgreSQL 是否运行
if docker ps --filter "name=vulun-postgres" --filter "status=running" --format "{{.Names}}" | grep -q "vulun-postgres"; then
    echo -e "${GREEN}✅ PostgreSQL 已运行 (容器: vulun-postgres)${NC}"
else
    echo -e "${RED}❌ PostgreSQL 未运行${NC}"
    echo -e "${YELLOW}请先启动 PostgreSQL:${NC}"
    echo -e "  ${BLUE}cd ~/Desktop/scanner/docker/infrastructure${NC}"
    echo -e "  ${BLUE}docker-compose up -d postgres${NC}"
    echo ""
    exit 1
fi

# 检查端口占用情况
echo ""
echo -e "${BLUE}检查端口占用情况...${NC}"
port_check_failed=false

if lsof -ti:8888 > /dev/null 2>&1; then
    echo -e "${RED}❌ 端口 8888 (Django) 已被占用${NC}"
    echo -e "${YELLOW}   占用进程 PID: $(lsof -ti:8888)${NC}"
    port_check_failed=true
fi

if lsof -ti:4200 > /dev/null 2>&1; then
    echo -e "${RED}❌ 端口 4200 (Prefect) 已被占用${NC}"
    echo -e "${YELLOW}   占用进程 PID: $(lsof -ti:4200)${NC}"
    port_check_failed=true
fi

if [ "$port_check_failed" = true ]; then
    echo ""
    echo -e "${YELLOW}请先运行停止脚本清理端口占用:${NC}"
    echo -e "  ${BLUE}bash script/stop.sh${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ 所有端口可用${NC}"

echo ""
echo -e "${BLUE}正在启动各项服务...${NC}"
echo ""

# 1. 启动 Django 开发服务器
echo -e "${YELLOW}[1/3] 启动 Django 开发服务器 (端口 8888)...${NC}"
nohup $VENV_PYTHON manage.py runserver 0.0.0.0:8888 \
    > "$LOG_DIR/django.log" 2>&1 &
echo $! > "$PID_DIR/django.pid"
sleep 2
if ps -p $(cat "$PID_DIR/django.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Django 启动成功 (PID: $(cat "$PID_DIR/django.pid"))${NC}"
else
    echo -e "${RED}   ❌ Django 启动失败，请检查日志: $LOG_DIR/django.log${NC}"
fi

# 2. 启动 Prefect Server
echo -e "${YELLOW}[2/3] 启动 Prefect Server (端口 4200)...${NC}"
export PREFECT_API_DATABASE_CONNECTION_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/prefect"
nohup $VENV_PREFECT server start \
    --host 0.0.0.0 \
    --port 4200 \
    > "$LOG_DIR/prefect_server.log" 2>&1 &
echo $! > "$PID_DIR/prefect_server.pid"
sleep 3
if ps -p $(cat "$PID_DIR/prefect_server.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Prefect Server 启动成功 (PID: $(cat "$PID_DIR/prefect_server.pid"))${NC}"
else
    echo -e "${RED}   ❌ Prefect Server 启动失败，请检查日志${NC}"
fi

# 3. 启动 Prefect Worker
echo -e "${YELLOW}[3/3] 启动 Prefect Worker (工作池: default)...${NC}"
export PREFECT_API_URL="http://localhost:4200/api"
nohup $VENV_PREFECT worker start \
    --pool default \
    --limit 10 \
    > "$LOG_DIR/prefect_worker.log" 2>&1 &
echo $! > "$PID_DIR/prefect_worker.pid"
sleep 2
if ps -p $(cat "$PID_DIR/prefect_worker.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Prefect Worker 启动成功 (PID: $(cat "$PID_DIR/prefect_worker.pid"))${NC}"
else
    echo -e "${RED}   ❌ Prefect Worker 启动失败，请检查日志${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ 所有服务启动完成！${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}服务访问地址：${NC}"
echo -e "  • Django API:     ${GREEN}http://localhost:8888${NC}"
echo -e "  • API 文档:       ${GREEN}http://localhost:8888/swagger/${NC}"
echo -e "  • Prefect UI:     ${GREEN}http://localhost:4200${NC}"
echo ""
echo -e "${YELLOW}日志文件位置：${NC}"
echo -e "  • Django:         $LOG_DIR/django.log"
echo -e "  • Prefect Server: $LOG_DIR/prefect_server.log"
echo -e "  • Prefect Worker: $LOG_DIR/prefect_worker.log"
echo ""
echo -e "${YELLOW}停止所有服务：${NC}"
echo -e "  bash script/stop.sh"
echo ""
