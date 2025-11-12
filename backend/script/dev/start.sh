#!/bin/bash
# XingRin 开发环境启动脚本
# 
# 功能：
# - 检查并启动 Prefect Server
# - 启动 Django 开发服务器
# - 启动 Prefect Deployments（扫描任务 + 清理任务）

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../.." && pwd )"
PROJECT_ROOT="$( cd "$BACKEND_DIR/.." && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"

# 创建 PID 目录
mkdir -p "$PID_DIR"

echo -e "${BLUE}=============================="
echo -e "  XingRin 开发环境启动"
echo -e "==============================${NC}"
echo ""

# 1. 检查虚拟环境
if [ ! -d "$PROJECT_ROOT/.venv" ]; then
    echo -e "${RED}✗ 虚拟环境不存在${NC}"
    echo "请先创建虚拟环境: python -m venv .venv"
    exit 1
fi

echo -e "${GREEN}✓ 虚拟环境已找到${NC}"
PYTHON="$PROJECT_ROOT/.venv/bin/python"
PIP="$PROJECT_ROOT/.venv/bin/pip"

# 2. 检查依赖
echo ""
echo "检查依赖..."
if ! $PYTHON -c "import django" 2>/dev/null; then
    echo -e "${YELLOW}⚠ 缺少依赖，正在安装...${NC}"
    cd "$BACKEND_DIR"
    $PIP install -r requirements.txt
fi
echo -e "${GREEN}✓ 依赖已安装${NC}"

# 3. 检查 Prefect Server
echo ""
echo "检查 Prefect Server..."
if ! curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Prefect Server 未运行，正在启动...${NC}"
    
    # 启动 Prefect Server（后台）
    nohup $PROJECT_ROOT/.venv/bin/prefect server start > "$PID_DIR/prefect-server.log" 2>&1 &
    echo $! > "$PID_DIR/prefect-server.pid"
    
    echo "等待 Prefect Server 启动..."
    sleep 5
    
    # 验证启动
    if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Prefect Server 已启动${NC}"
        echo "  访问: http://localhost:4200"
    else
        echo -e "${RED}✗ Prefect Server 启动失败${NC}"
        echo "  查看日志: tail -f $PID_DIR/prefect-server.log"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Prefect Server 已运行${NC}"
fi

# 4. 检查数据库
echo ""
echo "检查数据库连接..."
cd "$BACKEND_DIR"
if ! $PYTHON manage.py migrate --check > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ 需要运行迁移${NC}"
    $PYTHON manage.py migrate
fi
echo -e "${GREEN}✓ 数据库连接正常${NC}"

# 5. 启动 Django 开发服务器
echo ""
echo "启动 Django 开发服务器..."
if [ -f "$PID_DIR/django.pid" ]; then
    OLD_PID=$(cat "$PID_DIR/django.pid")
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Django 已在运行 (PID: $OLD_PID)${NC}"
    else
        rm "$PID_DIR/django.pid"
    fi
fi

if [ ! -f "$PID_DIR/django.pid" ]; then
    cd "$BACKEND_DIR"
    nohup $PYTHON manage.py runserver 8888 > "$PID_DIR/django.log" 2>&1 &
    echo $! > "$PID_DIR/django.pid"
    sleep 2
    
    if ps -p $(cat "$PID_DIR/django.pid") > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Django 已启动${NC}"
        echo "  访问: http://localhost:8888"
    else
        echo -e "${RED}✗ Django 启动失败${NC}"
        echo "  查看日志: tail -f $PID_DIR/django.log"
        exit 1
    fi
fi

# 6. 设置运行模式
echo ""
echo "使用本地开发模式（修改代码立即生效）"
export WORKER_MODE=local
echo -e "${GREEN}✓ 本地开发模式已启用${NC}"

# 7. 启动 Prefect Deployments
echo ""
echo "启动 Prefect Deployments..."

DEPLOYMENT_DIR="$BACKEND_DIR/apps/scan/deployments"

# 启动扫描任务 Deployment
echo "  - 启动扫描任务..."
cd "$DEPLOYMENT_DIR"
nohup $PYTHON initiate_scan_deployment.py > "$PID_DIR/scan-deployment.log" 2>&1 &
echo $! > "$PID_DIR/scan-deployment.pid"

# 启动清理任务 Deployment
echo "  - 启动清理任务..."
nohup $PYTHON cleanup_deployment.py > "$PID_DIR/cleanup-deployment.log" 2>&1 &
echo $! > "$PID_DIR/cleanup-deployment.pid"

sleep 2

# 验证 Deployments 启动
if ps -p $(cat "$PID_DIR/scan-deployment.pid") > /dev/null 2>&1 && \
   ps -p $(cat "$PID_DIR/cleanup-deployment.pid") > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prefect Deployments 已启动${NC}"
else
    echo -e "${RED}✗ Deployments 启动失败${NC}"
    echo "  查看日志:"
    echo "    - tail -f $PID_DIR/scan-deployment.log"
    echo "    - tail -f $PID_DIR/cleanup-deployment.log"
    exit 1
fi

# 8. 显示状态
echo ""
echo -e "${GREEN}=============================="
echo -e "  ✓ 所有服务已启动"
echo -e "==============================${NC}"
echo ""
echo "服务列表:"
echo "  - Prefect Server:  http://localhost:4200"
echo "  - Django API:      http://localhost:8888"
echo "  - Scan Deployment: 运行中 (PID: $(cat $PID_DIR/scan-deployment.pid))"
echo "  - Cleanup Deploy:  运行中 (PID: $(cat $PID_DIR/cleanup-deployment.pid))"
echo ""
echo "日志文件:"
echo "  - Prefect:  $PID_DIR/prefect-server.log"
echo "  - Django:   $PID_DIR/django.log"
echo "  - Scan:     $PID_DIR/scan-deployment.log"
echo "  - Cleanup:  $PID_DIR/cleanup-deployment.log"
echo ""
echo "管理命令:"
echo "  - 查看状态: ./script/dev/status.sh"
echo "  - 重启服务: ./script/dev/restart.sh"
echo "  - 停止服务: ./script/dev/stop.sh"
echo ""
