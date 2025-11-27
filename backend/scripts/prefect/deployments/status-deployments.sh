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
PID_DIR="$SCRIPT_DIR/.pids"
BACKEND_DIR="$( cd "$SCRIPT_DIR/../../.." && pwd )"
LOG_DIR="$BACKEND_DIR/logs/prefect"

# 为 Prefect CLI 指定本地 Server
export PREFECT_API_URL="${PREFECT_API_URL:-http://localhost:4200/api}"

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


# 检查 Prefect Server 中的 Deployments
echo ""
echo "Prefect Server 中的 Deployments:"
echo "==============================="

if curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    cd "$BACKEND_DIR"
    
    if command -v prefect > /dev/null 2>&1; then
        # 使用 prefect CLI 获取 deployments 信息
        if command -v timeout > /dev/null 2>&1; then
            DEPLOYMENTS_INFO=$(timeout 10 prefect deployment ls 2>/dev/null || echo "")
        else
            DEPLOYMENTS_INFO=$(prefect deployment ls 2>/dev/null || echo "")
        fi
        
        if [ -n "$DEPLOYMENTS_INFO" ]; then
            echo "$DEPLOYMENTS_INFO"
        else
            echo -e "${YELLOW}⚠ 无法获取 Server 中的 Deployments 信息${NC}"
            echo "  可能原因："
            echo "  - 没有 Deployments 注册到 Server"
            echo "  - Prefect CLI 配置问题"
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
    if command -v timeout > /dev/null 2>&1; then
        FLOW_RUNS_INFO=$(timeout 10 prefect flow-run ls --limit 5 2>/dev/null || echo "")
    else
        FLOW_RUNS_INFO=$(prefect flow-run ls --limit 5 2>/dev/null || echo "")
    fi
    
    if [ -n "$FLOW_RUNS_INFO" ]; then
        echo "$FLOW_RUNS_INFO"
    else
        echo -e "${YELLOW}⚠ 无法获取 Flow Runs 信息${NC}"
    fi
else
    echo -e "${YELLOW}⚠ 无法获取 Flow Runs 信息（Server 或 CLI 不可用）${NC}"
fi

# 显示注册日志信息
echo ""
echo "注册日志:"
echo "========"

# 定义 Deployments 列表（避免使用关联数组，macOS Bash 3.x 不支持）
deployments_keys=("scan-deployment" "cleanup-deployment" "targets-delete-deployment")

for deployment_key in "${deployments_keys[@]}"; do
    # 模拟关联数组的值
    case $deployment_key in
        "scan-deployment") deployment_name="扫描任务" ;;
        "cleanup-deployment") deployment_name="清理任务" ;;
        "targets-delete-deployment") deployment_name="删除任务" ;;
    esac

    log_file="$LOG_DIR/${deployment_key}.log"
    
    if [ -f "$log_file" ]; then
        file_size=$(du -h "$log_file" | cut -f1)
        echo "  $deployment_name: $log_file ($file_size)"
        
        # 检查最近的错误
        last_error_line=$(grep -i "error\|exception\|failed" "$log_file" | tail -1 || true)
        if [ -n "$last_error_line" ]; then
            echo -e "    ${YELLOW}最近错误:${NC}"
            echo "$last_error_line" | sed 's/^/      /'
        else
            # 检查成功标志
            if grep -qi "Success" "$log_file"; then
                echo -e "    ${GREEN}注册成功${NC}"
            fi
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
