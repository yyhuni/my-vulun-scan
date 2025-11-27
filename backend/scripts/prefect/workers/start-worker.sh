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
PID_DIR="$SCRIPT_DIR/.pids"
PYTHON="$PROJECT_ROOT/.venv/bin/python"

# 创建 PID 目录
mkdir -p "$PID_DIR"

# 加载 .env 文件（如果存在）
if [ -f "$BACKEND_DIR/.env" ]; then
    set -a
    source "$BACKEND_DIR/.env"
    set +a
fi

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
    echo "  -a, --api-url <url>    Prefect API URL (从 .env 读取)"
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
API_URL="${PREFECT_API_URL:-}"
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
        -a|--api-url)
            API_URL="$2"
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

# 检查 API URL 是否配置
if [ -z "$API_URL" ]; then
    echo -e "${RED}❌ 未配置 PREFECT_API_URL${NC}"
    echo ""
    echo "请在 .env 文件中配置："
    echo "  PREFECT_API_URL=http://<服务器IP>:4200/api"
    echo ""
    echo "或通过命令行参数指定："
    echo "  $0 -a http://<服务器IP>:4200/api"
    exit 1
fi

echo "🔧 Prefect Worker 启动脚本"
echo "=========================="
echo "  Worker 名称: $WORKER_NAME"
echo "  工作池: $POOL_NAME"
echo "  并发限制: $LIMIT"
echo "  API URL: $API_URL"
echo "  运行模式: $([ "$FOREGROUND" = true ] && echo "前台" || echo "后台")"

# 设置环境变量
export PREFECT_API_URL="$API_URL"
export DJANGO_SETTINGS_MODULE="config.settings"

# 检查 Prefect Server 是否运行
echo ""
echo "检查 Prefect Server..."
if ! curl -s "${API_URL%/api}/api/health" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ 无法连接 Prefect Server: $API_URL${NC}"
    echo "Worker 仍将启动，等待 Server 可用..."
else
    echo -e "${GREEN}✓ Prefect Server 已运行${NC}"
fi

# 切换到 backend 目录（重要：确保读取 .env 文件）
cd "$BACKEND_DIR"

# 构建 Worker 启动命令
WORKER_CMD="$PYTHON -m prefect worker start"
WORKER_CMD="$WORKER_CMD --pool $POOL_NAME"
WORKER_CMD="$WORKER_CMD --limit $LIMIT"
WORKER_CMD="$WORKER_CMD --name $WORKER_NAME"

# 日志放在 backend/logs/prefect/，PID 放在 .pids
LOG_DIR="$BACKEND_DIR/logs/prefect"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/worker-${WORKER_NAME}.log"
PID_FILE="$PID_DIR/worker-${WORKER_NAME}.pid"

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
