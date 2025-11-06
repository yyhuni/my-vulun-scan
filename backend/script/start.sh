#!/bin/bash

################################################################################
# XingRin 后端服务启动脚本
# 
# 启动以下服务：
# 1. Django 开发服务器 (端口 8888)
# 2. Celery Worker - orchestrator 队列 (编排任务)
# 3. Celery Worker - scans 队列 (扫描任务)
# 4. Celery Beat (定时任务调度器)
# 5. Flower (Celery 监控工具，端口 5555)
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
VENV_CELERY="$HOME/Desktop/scanner/.venv/bin/celery"

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

# 检查 Redis 是否运行（通过 Docker 容器）
if docker ps --filter "name=vulun-redis" --filter "status=running" --format "{{.Names}}" | grep -q "vulun-redis"; then
    echo -e "${GREEN}✅ Redis 已运行 (容器: vulun-redis)${NC}"
else
    echo -e "${RED}❌ Redis 未运行${NC}"
    echo -e "${YELLOW}请先启动 Redis:${NC}"
    echo -e "  ${BLUE}cd ~/Desktop/scanner/docker/infrastructure${NC}"
    echo -e "  ${BLUE}docker-compose up -d redis${NC}"
    echo ""
    exit 1
fi

echo ""
echo -e "${BLUE}正在启动各项服务...${NC}"
echo ""

# 1. 启动 Django 开发服务器
echo -e "${YELLOW}[1/5] 启动 Django 开发服务器 (端口 8888)...${NC}"
nohup $VENV_PYTHON manage.py runserver 0.0.0.0:8888 \
    > "$LOG_DIR/django.log" 2>&1 &
echo $! > "$PID_DIR/django.pid"
sleep 2
if ps -p $(cat "$PID_DIR/django.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Django 启动成功 (PID: $(cat "$PID_DIR/django.pid"))${NC}"
else
    echo -e "${RED}   ❌ Django 启动失败，请检查日志: $LOG_DIR/django.log${NC}"
fi

# 2. 启动 Celery Worker - orchestrator 队列
echo -e "${YELLOW}[2/5] 启动 Celery Worker - orchestrator 队列...${NC}"
nohup $VENV_CELERY -A config worker \
    --queues=orchestrator \
    --concurrency=4 \
    --loglevel=info \
    --logfile="$LOG_DIR/celery_orchestrator.log" \
    --pidfile="$PID_DIR/celery_orchestrator.pid" \
    --hostname=orchestrator@%h \
    > "$LOG_DIR/celery_orchestrator_stdout.log" 2>&1 &
sleep 2
if [ -f "$PID_DIR/celery_orchestrator.pid" ] && ps -p $(cat "$PID_DIR/celery_orchestrator.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Orchestrator Worker 启动成功 (PID: $(cat "$PID_DIR/celery_orchestrator.pid"))${NC}"
else
    echo -e "${RED}   ❌ Orchestrator Worker 启动失败，请检查日志${NC}"
fi

# 3. 启动 Celery Worker - scans 队列
echo -e "${YELLOW}[3/5] 启动 Celery Worker - scans 队列...${NC}"
nohup $VENV_CELERY -A config worker \
    --queues=scans \
    --concurrency=2 \
    --loglevel=info \
    --logfile="$LOG_DIR/celery_scans.log" \
    --pidfile="$PID_DIR/celery_scans.pid" \
    --hostname=scans@%h \
    > "$LOG_DIR/celery_scans_stdout.log" 2>&1 &
sleep 2
if [ -f "$PID_DIR/celery_scans.pid" ] && ps -p $(cat "$PID_DIR/celery_scans.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Scans Worker 启动成功 (PID: $(cat "$PID_DIR/celery_scans.pid"))${NC}"
else
    echo -e "${RED}   ❌ Scans Worker 启动失败，请检查日志${NC}"
fi

# 4. 启动 Celery Beat (定时任务调度器)
echo -e "${YELLOW}[4/5] 启动 Celery Beat (定时任务调度器)...${NC}"
nohup $VENV_CELERY -A config beat \
    --schedule="$DB_DIR/celerybeat-schedule" \
    --loglevel=info \
    --logfile="$LOG_DIR/celery_beat.log" \
    --pidfile="$PID_DIR/celery_beat.pid" \
    > "$LOG_DIR/celery_beat_stdout.log" 2>&1 &
sleep 2
if [ -f "$PID_DIR/celery_beat.pid" ] && ps -p $(cat "$PID_DIR/celery_beat.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Celery Beat 启动成功 (PID: $(cat "$PID_DIR/celery_beat.pid"))${NC}"
else
    echo -e "${RED}   ❌ Celery Beat 启动失败，请检查日志${NC}"
fi

# 5. 启动 Flower (监控工具)
echo -e "${YELLOW}[5/5] 启动 Flower (端口 5555)...${NC}"
nohup $VENV_CELERY -A config flower \
    --conf=config/flower_config.py \
    > "$LOG_DIR/flower.log" 2>&1 &
echo $! > "$PID_DIR/flower.pid"
sleep 2
if ps -p $(cat "$PID_DIR/flower.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Flower 启动成功 (PID: $(cat "$PID_DIR/flower.pid"))${NC}"
else
    echo -e "${RED}   ❌ Flower 启动失败，请检查日志: $LOG_DIR/flower.log${NC}"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ 所有服务启动完成！${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}服务访问地址：${NC}"
echo -e "  • Django API:     ${GREEN}http://localhost:8888${NC}"
echo -e "  • API 文档:       ${GREEN}http://localhost:8888/swagger/${NC}"
echo -e "  • Flower 监控:    ${GREEN}http://localhost:5555${NC}"
echo ""
echo -e "${YELLOW}日志文件位置：${NC}"
echo -e "  • Django:         $LOG_DIR/django.log"
echo -e "  • Orchestrator:   $LOG_DIR/celery_orchestrator.log"
echo -e "  • Scans Worker:   $LOG_DIR/celery_scans.log"
echo -e "  • Celery Beat:    $LOG_DIR/celery_beat.log"
echo -e "  • Flower:         $LOG_DIR/flower.log"
echo ""
echo -e "${YELLOW}停止所有服务：${NC}"
echo -e "  bash stop.sh"
echo ""
