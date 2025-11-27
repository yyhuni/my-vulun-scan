#!/bin/bash
# Prefect Deployments 启动脚本
#
# 功能：
# - 启动所有 Prefect Deployments
# - 支持选择性启动特定 Deployment
# - 后台运行，生成日志文件

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
PROJECT_ROOT="$( cd "$BACKEND_DIR/.." && pwd )"
PYTHON="$PROJECT_ROOT/.venv/bin/python"
LOG_DIR="$BACKEND_DIR/logs/prefect"

# 创建目录
mkdir -p "$PID_DIR"
mkdir -p "$LOG_DIR"

echo "🚀 Prefect Deployments 启动脚本"
echo "=================================="

# 检查 Prefect Server 是否运行
if ! curl -s http://localhost:4200/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Prefect Server 未运行${NC}"
    echo "请先启动 Prefect Server："
    echo "  ./scripts/dev/start.sh"
    echo "  或者："
    echo "  ./scripts/prefect/start-server.sh"
    exit 1
fi

echo -e "${GREEN}✓ Prefect Server 已运行${NC}"

# 切换到 backend 目录（重要：确保读取 .env 文件）
cd "$BACKEND_DIR"
export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"

# 函数：启动单个 Deployment
start_deployment() {
    local name=$1
    local module_path=$2
    local log_file="$LOG_DIR/$3"
    local pid_file="$PID_DIR/$4"
    
    echo "  - 启动 $name..."
    
    # 检查是否已经在运行
    if [ -f "$pid_file" ] && ps -p $(cat "$pid_file") > /dev/null 2>&1; then
        echo -e "${YELLOW}    ⚠ $name 已在运行 (PID: $(cat "$pid_file"))${NC}"
        return
    fi
    
    # 启动 Deployment（同步运行，注册完成后退出）
    if $PYTHON $module_path > "$log_file" 2>&1; then
        echo -e "${GREEN}    ✓ $name 注册成功${NC}"
        # 注册成功后不需要 PID 文件，因为它不是常驻进程
        rm -f "$pid_file"
    else
        echo -e "${RED}    ❌ $name 注册失败${NC}"
        echo "    查看日志: cat $log_file"
        # 显示最后的错误日志
        tail -n 5 "$log_file" | sed 's/^/      /'
    fi
}

# 函数：启动所有 Deployments
start_all() {
    echo ""
    echo "注册所有 Prefect Deployments..."
    
    # 使用模块方式运行 (-m)，这样支持相对导入
    start_deployment "扫描任务" \
        "-m apps.scan.deployments.initiate_scan_deployment" \
        "scan-deployment.log" \
        "scan-deployment.pid"
    
    start_deployment "清理任务" \
        "-m apps.scan.deployments.cleanup_deployment" \
        "cleanup-deployment.log" \
        "cleanup-deployment.pid"
    
    start_deployment "Targets 删除任务" \
        "-m apps.targets.deployments.register" \
        "targets-delete-deployment.log" \
        "targets-delete-deployment.pid"
    
    # start_deployment "Asset 删除任务" \
    #     "-m apps.asset.deployments.register" \
    #     "asset-delete-deployment.log" \
    #     "asset-delete-deployment.pid"
    
    echo ""
    echo -e "${GREEN}✓ 所有 Deployments 注册流程结束${NC}"
}

# 函数：显示帮助
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  all, -a, --all        启动所有 Deployments（默认）"
    echo "  scan, -s, --scan      只启动扫描任务 Deployment"
    echo "  cleanup, -c, --cleanup 只启动清理任务 Deployment"
    echo "  delete, -d, --delete   只启动删除任务 Deployment"
    echo "  status, --status       查看 Deployments 运行状态"
    echo "  logs, -l, --logs       查看 Deployments 日志"
    echo "  help, -h, --help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                     # 启动所有 Deployments"
    echo "  $0 scan                # 只启动扫描任务"
    echo "  $0 status              # 查看运行状态"
    echo "  $0 logs                # 查看日志"
}

# 函数：查看状态
show_status() {
    echo ""
    echo "Prefect Deployments 注册日志："
    echo "=============================="
    
    # Deployments 是短暂运行的注册进程，不是常驻进程
    # 所以这里检查日志文件而不是 PID
    local logs=(
        "scan-deployment.log:扫描任务"
        "cleanup-deployment.log:清理任务"
        "targets-delete-deployment.log:删除任务"
    )
    
    for log_entry in "${logs[@]}"; do
        local log_name=$(echo $log_entry | cut -d: -f1)
        local display_name=$(echo $log_entry | cut -d: -f2)
        local log_file="$LOG_DIR/$log_name"
        
        if [ -f "$log_file" ]; then
            local file_size=$(du -h "$log_file" | cut -f1)
            echo "  $display_name: $log_file ($file_size)"
            # 检查成功标志
            if grep -qi "Success" "$log_file" 2>/dev/null; then
                echo -e "    ${GREEN}注册成功${NC}"
            elif grep -qi "error\|exception\|failed" "$log_file" 2>/dev/null; then
                echo -e "    ${RED}注册失败${NC}"
            fi
        else
            echo -e "  $display_name: ${YELLOW}日志文件不存在${NC}"
        fi
    done
}

# 函数：查看日志
show_logs() {
    echo ""
    echo "Prefect Deployments 日志文件："
    echo "============================="
    echo "  扫描任务: $LOG_DIR/scan-deployment.log"
    echo "  清理任务: $LOG_DIR/cleanup-deployment.log"
    echo "  删除任务: $LOG_DIR/targets-delete-deployment.log"
    echo ""
    echo "查看实时日志："
    echo "  tail -f $LOG_DIR/scan-deployment.log"
    echo "  tail -f $LOG_DIR/cleanup-deployment.log"
    echo "  tail -f $LOG_DIR/targets-delete-deployment.log"
}

# 解析命令行参数
case "${1:-all}" in
    all|-a|--all)
        start_all
        ;;
    scan|-s|--scan)
        echo ""
        echo "注册扫描任务 Deployment..."
        start_deployment "扫描任务" \
            "-m apps.scan.deployments.initiate_scan_deployment" \
            "scan-deployment.log" \
            "scan-deployment.pid"
        ;;
    cleanup|-c|--cleanup)
        echo ""
        echo "注册清理任务 Deployment..."
        start_deployment "清理任务" \
            "-m apps.scan.deployments.cleanup_deployment" \
            "cleanup-deployment.log" \
            "cleanup-deployment.pid"
        ;;
    delete|-d|--delete)
        echo ""
        echo "注册删除任务 Deployments..."
        start_deployment "Targets 删除任务" \
            "-m apps.targets.deployments.register" \
            "targets-delete-deployment.log" \
            "targets-delete-deployment.pid"
        ;;
    status|--status)
        show_status
        ;;
    logs|-l|--logs)
        show_logs
        ;;
    help|-h|--help)
        show_help
        ;;
    *)
        echo -e "${RED}❌ 未知选项: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac

echo ""
echo "🔗 相关链接："
echo "  Prefect UI: http://localhost:4200"
echo "  Django API: http://localhost:8888"
echo ""
echo "📋 管理命令："
echo "  查看状态: $0 status"
echo "  查看日志: $0 logs"
echo "  停止服务: ./scripts/prefect/stop-deployments.sh"
