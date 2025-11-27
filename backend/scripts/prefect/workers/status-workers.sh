#!/bin/bash
# Prefect Workers 状态检查脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../../.." && pwd )"
LOG_DIR="$BACKEND_DIR/logs/prefect"

# API URL（优先使用环境变量），并导出给 Prefect CLI 使用
PREFECT_API_URL="${PREFECT_API_URL:-http://localhost:4200/api}"
export PREFECT_API_URL
API_URL="$PREFECT_API_URL"
SERVER_URL="${API_URL%/api}"

echo "📊 Prefect Workers 状态"
echo "======================"

# 检查 Prefect Server 连接
echo ""
echo "Prefect Server 连接:"
echo "  API URL: $API_URL"
if curl -s "${SERVER_URL}/api/health" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Server 连接正常${NC}"
else
    echo -e "  ${RED}❌ 无法连接到 Prefect Server${NC}"
    echo "  请确保 Prefect Server 正在运行"
fi

# 检查本地 Workers
echo ""
echo "本地 Workers:"
echo "============"

local_workers=($(find "$PID_DIR" -name "worker-*.pid" 2>/dev/null || true))

if [ ${#local_workers[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠ 没有找到本地 Worker 进程${NC}"
else
    echo ""
    printf "%-20s %-10s %-15s %-10s\n" "Worker 名称" "状态" "PID" "内存使用"
    echo "------------------------------------------------------------"
    
    for pid_file in "${local_workers[@]}"; do
        worker_name=$(basename "$pid_file" .pid | sed 's/worker-//')
        pid=$(cat "$pid_file" 2>/dev/null || echo "")
        
        if [ -n "$pid" ] && ps -p $pid > /dev/null 2>&1; then
            # 获取内存使用情况
            memory=$(ps -p $pid -o rss= 2>/dev/null | awk '{print int($1/1024)"MB"}' || echo "未知")
            printf "%-20s ${GREEN}%-10s${NC} %-15s %-10s\n" "$worker_name" "运行中" "$pid" "$memory"
        else
            printf "%-20s ${RED}%-10s${NC} %-15s %-10s\n" "$worker_name" "已停止" "N/A" "N/A"
            # 清理无效的 PID 文件
            rm -f "$pid_file"
        fi
    done
fi

# 检查 Prefect Server 中的 Workers（如果可以连接）
echo ""
echo "Prefect Server 中的 Workers:"
echo "============================"

if curl -s "${SERVER_URL}/api/health" > /dev/null 2>&1; then
    # 当前 Prefect 版本的 CLI 只提供 worker start，不支持通过 CLI 列出 Workers，改为指引到 UI
    echo "  当前 Prefect CLI 不支持列出 Workers，请在 Prefect UI 查看: ${SERVER_URL}/workers"
else
    echo -e "${YELLOW}⚠ 无法连接到 Prefect Server，无法获取 Workers 信息${NC}"
fi

# 显示工作池信息
echo ""
echo "工作池信息:"
echo "=========="

if curl -s "${SERVER_URL}/api/health" > /dev/null 2>&1 && command -v prefect > /dev/null 2>&1; then
    cd "$BACKEND_DIR"
    if command -v timeout > /dev/null 2>&1; then
        POOLS_INFO=$(timeout 10 prefect work-pool ls 2>/dev/null || echo "")
    else
        POOLS_INFO=$(prefect work-pool ls 2>/dev/null || echo "")
    fi
    
    if [ -n "$POOLS_INFO" ]; then
        echo "$POOLS_INFO"
    else
        echo -e "${YELLOW}⚠ 无法获取工作池信息${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 无法获取工作池信息（Server 或 CLI 不可用）${NC}"
fi

# 显示日志文件信息
echo ""
echo "日志文件:"
echo "========"

for pid_file in "${local_workers[@]}"; do
    worker_name=$(basename "$pid_file" .pid | sed 's/worker-//')
    log_file="$LOG_DIR/worker-${worker_name}.log"
    
    if [ -f "$log_file" ]; then
        file_size=$(du -h "$log_file" | cut -f1)
        echo "  $worker_name: $log_file ($file_size)"
        echo "    查看: tail -f $log_file"
    fi
done

# 显示管理命令
echo ""
echo "🔧 管理命令:"
echo "  启动 Worker: ./scripts/prefect/workers/start-worker.sh"
echo "  停止 Worker: ./scripts/prefect/workers/stop-worker.sh -n <name>"
echo "  停止所有: ./scripts/prefect/workers/stop-worker.sh -a"

echo ""
echo "🔗 相关链接:"
echo "  Prefect UI: $SERVER_URL"
echo "  Workers 页面: $SERVER_URL/workers"
echo "  Work Pools: $SERVER_URL/work-pools"
