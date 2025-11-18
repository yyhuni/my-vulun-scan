#!/bin/bash
# Prefect Deployments 状态检查脚本

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录和项目根目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../../.." && pwd )"

echo "📊 Prefect Deployments 状态"
echo "=========================="

# 检查 Prefect Server 连接
echo ""
echo "Prefect Server 连接:"
if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Server 连接正常${NC}"
else
    echo -e "  ${RED}❌ 无法连接到 Prefect Server${NC}"
    echo "  请确保 Prefect Server 正在运行"
    echo "  启动命令: ./scripts/prefect/server/start-server.sh"
fi

# 检查本地 Deployments 进程
echo ""
echo "本地 Deployments 进程:"
echo "====================="

# 定义 Deployments 配置
declare -A deployments=(
    ["scan-deployment"]="扫描任务"
    ["cleanup-deployment"]="清理任务" 
    ["delete-deployment"]="删除任务"
)

echo ""
printf "%-20s %-15s %-10s %-15s %-10s\n" "Deployment" "描述" "状态" "PID" "内存使用"
echo "------------------------------------------------------------------------"

for deployment_key in "${!deployments[@]}"; do
    deployment_name="${deployments[$deployment_key]}"
    pid_file="$SCRIPT_DIR/${deployment_key}.pid"
    log_file="$SCRIPT_DIR/${deployment_key}.log"
    
    if [ -f "$pid_file" ]; then
        pid=$(cat "$pid_file" 2>/dev/null || echo "")
        
        if [ -n "$pid" ] && ps -p $pid > /dev/null 2>&1; then
            # 获取内存使用情况
            memory=$(ps -p $pid -o rss= 2>/dev/null | awk '{print int($1/1024)"MB"}' || echo "未知")
            printf "%-20s %-15s ${GREEN}%-10s${NC} %-15s %-10s\n" "$deployment_key" "$deployment_name" "运行中" "$pid" "$memory"
        else
            printf "%-20s %-15s ${RED}%-10s${NC} %-15s %-10s\n" "$deployment_key" "$deployment_name" "已停止" "N/A" "N/A"
            # 清理无效的 PID 文件
            rm -f "$pid_file"
        fi
    else
        printf "%-20s %-15s ${YELLOW}%-10s${NC} %-15s %-10s\n" "$deployment_key" "$deployment_name" "未启动" "N/A" "N/A"
    fi
done

# 检查 Prefect Server 中的 Deployments
echo ""
echo "Prefect Server 中的 Deployments:"
echo "==============================="

if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    cd "$BACKEND_DIR"
    
    if command -v prefect > /dev/null 2>&1; then
        # 使用 prefect CLI 获取 deployments 信息
        DEPLOYMENTS_INFO=$(timeout 10 prefect deployment ls 2>/dev/null || echo "")
        
        if [ -n "$DEPLOYMENTS_INFO" ]; then
            echo "$DEPLOYMENTS_INFO"
        else
            echo -e "${YELLOW}⚠ 无法获取 Server 中的 Deployments 信息${NC}"
            echo "  可能原因："
            echo "  - 没有 Deployments 注册到 Server"
            echo "  - Prefect CLI 配置问题"
            echo "  - Deployments 进程未运行"
        fi
    else
        echo -e "${YELLOW}⚠ Prefect CLI 不可用${NC}"
    fi
else
    echo -e "${RED}❌ 无法连接到 Prefect Server${NC}"
fi

# 检查最近的 Flow Runs
echo ""
echo "最近的 Flow Runs:"
echo "================"

if curl -s http://localhost:4200/api/health > /dev/null 2>&1 && command -v prefect > /dev/null 2>&1; then
    cd "$BACKEND_DIR"
    FLOW_RUNS_INFO=$(timeout 10 prefect flow-run ls --limit 5 2>/dev/null || echo "")
    
    if [ -n "$FLOW_RUNS_INFO" ]; then
        echo "$FLOW_RUNS_INFO"
    else
        echo -e "${YELLOW}⚠ 无法获取 Flow Runs 信息${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 无法获取 Flow Runs 信息（Server 或 CLI 不可用）${NC}"
fi

# 显示日志文件信息
echo ""
echo "日志文件:"
echo "========"

for deployment_key in "${!deployments[@]}"; do
    deployment_name="${deployments[$deployment_key]}"
    log_file="$SCRIPT_DIR/${deployment_key}.log"
    
    if [ -f "$log_file" ]; then
        file_size=$(du -h "$log_file" | cut -f1)
        echo "  $deployment_name: $log_file ($file_size)"
        echo "    查看: tail -f $log_file"
        
        # 检查最近的错误
        if grep -i "error\|exception\|failed" "$log_file" | tail -1 > /dev/null 2>&1; then
            echo -e "    ${YELLOW}最近错误:${NC}"
            grep -i "error\|exception\|failed" "$log_file" | tail -1 | sed 's/^/      /'
        fi
    else
        echo -e "  $deployment_name: ${YELLOW}日志文件不存在${NC}"
    fi
done

# 显示工作池状态
echo ""
echo "工作池状态:"
echo "=========="

if curl -s http://localhost:4200/api/health > /dev/null 2>&1 && command -v prefect > /dev/null 2>&1; then
    cd "$BACKEND_DIR"
    POOLS_INFO=$(timeout 10 prefect work-pool ls 2>/dev/null || echo "")
    
    if [ -n "$POOLS_INFO" ]; then
        echo "$POOLS_INFO"
    else
        echo -e "${YELLOW}⚠ 无法获取工作池信息${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 无法获取工作池信息（Server 或 CLI 不可用）${NC}"
fi

# 显示管理命令
echo ""
echo "🔧 管理命令:"
echo "  启动所有: ./scripts/prefect/deployments/start-deployments.sh"
echo "  启动扫描: ./scripts/prefect/deployments/start-deployments.sh scan"
echo "  启动删除: ./scripts/prefect/deployments/start-deployments.sh delete"
echo "  启动清理: ./scripts/prefect/deployments/start-deployments.sh cleanup"
echo "  停止所有: ./scripts/prefect/deployments/stop-deployments.sh"

echo ""
echo "🔗 相关链接:"
echo "  Prefect UI: http://localhost:4200"
echo "  Deployments: http://localhost:4200/deployments"
echo "  Flow Runs: http://localhost:4200/flow-runs"
echo "  Work Pools: http://localhost:4200/work-pools"
