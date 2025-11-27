#!/bin/bash
# Prefect Worker 停止脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"

# 函数：显示帮助
show_help() {
    echo "🛑 Prefect Worker 停止脚本"
    echo "=========================="
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -n, --name <name>      停止指定名称的 Worker"
    echo "  -a, --all              停止所有 Workers"
    echo "  -h, --help             显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 -n worker-123456789     # 停止指定 Worker"
    echo "  $0 -a                      # 停止所有 Workers"
    echo ""
    echo "注意:"
    echo "  - 如果不指定参数，将列出所有运行中的 Workers"
}

# 函数：停止单个 Worker
stop_worker() {
    local worker_name=$1
    local pid_file="$PID_DIR/worker-${worker_name}.pid"
    local log_file="$PID_DIR/worker-${worker_name}.log"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "  - 停止 Worker '$worker_name' (PID: $pid)..."
            kill $pid
            sleep 2
            
            # 强制停止（如果需要）
            if ps -p $pid > /dev/null 2>&1; then
                echo "    强制停止..."
                kill -9 $pid 2>/dev/null || true
            fi
            
            echo -e "    ${GREEN}✓ Worker '$worker_name' 已停止${NC}"
        else
            echo -e "    ${YELLOW}⚠ Worker '$worker_name' 未运行${NC}"
        fi
        rm -f "$pid_file"
    else
        echo -e "    ${YELLOW}⚠ Worker '$worker_name' PID 文件不存在${NC}"
    fi
}

# 函数：停止所有 Workers
stop_all_workers() {
    echo "停止所有 Prefect Workers..."
    
    # 查找所有 worker PID 文件
    local worker_pids=($(find "$PID_DIR" -name "worker-*.pid" 2>/dev/null || true))
    
    if [ ${#worker_pids[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠ 没有找到运行中的 Workers${NC}"
        return
    fi
    
    for pid_file in "${worker_pids[@]}"; do
        local worker_name=$(basename "$pid_file" .pid | sed 's/worker-//')
        stop_worker "$worker_name"
    done
    
    echo ""
    echo -e "${GREEN}✓ 所有 Workers 已停止${NC}"
}

# 函数：列出运行中的 Workers
list_workers() {
    echo "运行中的 Prefect Workers:"
    echo "========================"
    
    local worker_pids=($(find "$SCRIPT_DIR" -name "worker-*.pid" 2>/dev/null || true))
    
    if [ ${#worker_pids[@]} -eq 0 ]; then
        echo -e "${YELLOW}⚠ 没有找到运行中的 Workers${NC}"
        echo ""
        echo "启动 Worker:"
        echo "  ./scripts/prefect/workers/start-worker.sh"
        return
    fi
    
    for pid_file in "${worker_pids[@]}"; do
        local worker_name=$(basename "$pid_file" .pid | sed 's/worker-//')
        local pid=$(cat "$pid_file" 2>/dev/null || echo "")
        
        if [ -n "$pid" ] && ps -p $pid > /dev/null 2>&1; then
            echo -e "  ${GREEN}✓ $worker_name${NC} (PID: $pid)"
        else
            echo -e "  ${RED}❌ $worker_name${NC} (PID 文件存在但进程未运行)"
            # 清理无效的 PID 文件
            rm -f "$pid_file"
        fi
    done
    
    echo ""
    echo "停止 Worker:"
    echo "  $0 -n <worker_name>    # 停止指定 Worker"
    echo "  $0 -a                  # 停止所有 Workers"
}

# 解析命令行参数
WORKER_NAME=""
STOP_ALL=false

if [ $# -eq 0 ]; then
    list_workers
    exit 0
fi

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            WORKER_NAME="$2"
            shift 2
            ;;
        -a|--all)
            STOP_ALL=true
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

echo "🛑 Prefect Worker 停止脚本"
echo "========================="

if [ "$STOP_ALL" = true ]; then
    stop_all_workers
elif [ -n "$WORKER_NAME" ]; then
    echo "停止指定 Worker..."
    stop_worker "$WORKER_NAME"
else
    echo -e "${RED}❌ 请指定 Worker 名称或使用 -a 停止所有${NC}"
    echo ""
    show_help
    exit 1
fi
