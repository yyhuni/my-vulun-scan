#!/bin/bash
# Prefect Worker 启动脚本
#
# 功能：
# - 启动独立的 Prefect Worker
# - 支持指定工作池
# - 支持并发控制

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../../.." && pwd )"
PROJECT_ROOT="$( cd "$BACKEND_DIR/.." && pwd )"
PYTHON="$PROJECT_ROOT/.venv/bin/python"

# 默认配置
DEFAULT_POOL="development-pool"
DEFAULT_LIMIT=5
DEFAULT_NAME="worker-$(date +%s)"

# 函数：显示帮助
show_help() {
    echo "🔧 Prefect Worker 启动脚本"
    echo "=========================="
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -p, --pool <name>      工作池名称 (默认: $DEFAULT_POOL)"
    echo "  -l, --limit <number>   并发任务限制 (默认: $DEFAULT_LIMIT)"
    echo "  -n, --name <name>      Worker 名称 (默认: 自动生成)"
    echo "  -f, --foreground       前台运行（不后台化）"
    echo "  -h, --help             显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认配置启动"
    echo "  $0 -p production-pool -l 10          # 指定工作池和并发数"
    echo "  $0 -n scan-worker -f                 # 指定名称并前台运行"
    echo ""
    echo "注意:"
    echo "  - Worker 需要 Prefect Server 运行"
    echo "  - 确保工作池在 Prefect Server 中已存在"
    echo "  - 生产环境建议使用独立的 Worker 进程"
}

# 解析命令行参数
POOL_NAME="$DEFAULT_POOL"
LIMIT="$DEFAULT_LIMIT"
WORKER_NAME="$DEFAULT_NAME"
FOREGROUND=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--pool)
            POOL_NAME="$2"
            shift 2
            ;;
        -l|--limit)
            LIMIT="$2"
            shift 2
            ;;
        -n|--name)
            WORKER_NAME="$2"
            shift 2
            ;;
        -f|--foreground)
            FOREGROUND=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 未知选项: $1${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
done

echo "🔧 Prefect Worker 启动脚本"
echo "=========================="
echo "  Worker 名称: $WORKER_NAME"
echo "  工作池: $POOL_NAME"
echo "  并发限制: $LIMIT"
echo "  运行模式: $([ "$FOREGROUND" = true ] && echo "前台" || echo "后台")"

# 检查 Prefect Server 是否运行
echo ""
echo "检查 Prefect Server..."
if ! curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Prefect Server 未运行${NC}"
    echo "请先启动 Prefect Server："
    echo "  ./scripts/prefect/server/start-server.sh"
    exit 1
fi
echo -e "${GREEN}✓ Prefect Server 已运行${NC}"

# 切换到 backend 目录（重要：确保读取 .env 文件）
cd "$BACKEND_DIR"

# 构建 Worker 启动命令
WORKER_CMD="$PYTHON -m prefect worker start"
WORKER_CMD="$WORKER_CMD --pool $POOL_NAME"
WORKER_CMD="$WORKER_CMD --limit $LIMIT"
WORKER_CMD="$WORKER_CMD --name $WORKER_NAME"

LOG_FILE="$SCRIPT_DIR/worker-${WORKER_NAME}.log"
PID_FILE="$SCRIPT_DIR/worker-${WORKER_NAME}.pid"

echo ""
echo "启动 Prefect Worker..."
echo "  命令: $WORKER_CMD"

if [ "$FOREGROUND" = true ]; then
    # 前台运行
    echo -e "${BLUE}前台运行 Worker (按 Ctrl+C 停止)...${NC}"
    echo ""
    exec $WORKER_CMD
else
    # 后台运行
    echo "  日志文件: $LOG_FILE"
    echo "  PID 文件: $PID_FILE"
    
    # 检查是否已经运行
    if [ -f "$PID_FILE" ] && ps -p $(cat "$PID_FILE") > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Worker '$WORKER_NAME' 已在运行 (PID: $(cat "$PID_FILE"))${NC}"
        exit 0
    fi
    
    # 启动 Worker
    nohup $WORKER_CMD > "$LOG_FILE" 2>&1 &
    WORKER_PID=$!
    echo $WORKER_PID > "$PID_FILE"
    
    # 等待启动
    sleep 3
    
    # 验证启动
    if ps -p $WORKER_PID > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Worker '$WORKER_NAME' 已启动 (PID: $WORKER_PID)${NC}"
        echo ""
        echo "管理命令:"
        echo "  查看日志: tail -f $LOG_FILE"
        echo "  停止 Worker: ./scripts/prefect/workers/stop-worker.sh -n $WORKER_NAME"
        echo "  查看状态: ./scripts/prefect/workers/status-workers.sh"
    else
        echo -e "${RED}❌ Worker 启动失败${NC}"
        echo "查看日志: tail -f $LOG_FILE"
        exit 1
    fi
fi

echo ""
echo "🔗 相关链接:"
echo "  Prefect UI: http://localhost:4200"
echo "  Workers 页面: http://localhost:4200/workers"
