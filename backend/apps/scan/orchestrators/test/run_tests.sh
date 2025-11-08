#!/bin/bash
# DAG 编排器测试运行脚本

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/Users/yangyang/Desktop/scanner/backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}DAG 编排器测试运行器${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查当前目录
if [ ! -f "$PROJECT_ROOT/manage.py" ]; then
    echo -e "${RED}❌ 错误: 找不到 manage.py${NC}"
    echo -e "${YELLOW}请确保脚本中的 PROJECT_ROOT 路径正确${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

# 设置 Django 配置
export DJANGO_SETTINGS_MODULE=config.settings

# 检查是否安装了 pytest
if ! python -c "import pytest" &> /dev/null; then
    echo -e "${YELLOW}⚠️  pytest 未安装，正在安装...${NC}"
    pip install pytest pytest-django
fi

echo -e "${GREEN}✓${NC} 环境检查完成"
echo ""

# 运行测试的函数
run_test() {
    local test_path=$1
    local description=$2
    
    echo -e "${BLUE}运行: ${description}${NC}"
    echo -e "${YELLOW}----------------------------------------${NC}"
    
    if pytest "$test_path" -v --tb=short; then
        echo -e "${GREEN}✓ 测试通过${NC}"
    else
        echo -e "${RED}✗ 测试失败${NC}"
        return 1
    fi
    echo ""
}

# 主测试逻辑
case "${1:-all}" in
    "all")
        echo -e "${BLUE}📋 运行所有 DAG 编排器测试...${NC}"
        echo ""
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py" "所有测试"
        ;;
    
    "workflow")
        echo -e "${BLUE}📋 运行工作流编排测试...${NC}"
        echo ""
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_dispatch_workflow_single_task" "单任务工作流"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_dispatch_workflow_multiple_stages" "多阶段工作流"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_dispatch_workflow_parallel_tasks" "并行任务工作流"
        ;;
    
    "tasks")
        echo -e "${BLUE}📋 运行任务构建测试...${NC}"
        echo ""
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_tasks_success" "任务构建成功"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_tasks_disabled_task" "跳过未启用任务"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_tasks_unregistered_task" "跳过未注册任务"
        ;;
    
    "deps")
        echo -e "${BLUE}📋 运行依赖关系测试...${NC}"
        echo ""
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_extract_dependencies_simple" "简单依赖"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_extract_dependencies_multiple_deps" "多重依赖"
        ;;
    
    "stages")
        echo -e "${BLUE}📋 运行拓扑排序测试...${NC}"
        echo ""
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_dependency_stages_single_task" "单任务拓扑排序"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_dependency_stages_sequential" "串行拓扑排序"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_dependency_stages_parallel" "并行拓扑排序"
        run_test "apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_build_dependency_stages_circular_dependency" "循环依赖检测"
        ;;
    
    "coverage")
        echo -e "${BLUE}📊 运行测试并生成覆盖率报告...${NC}"
        echo ""
        
        # 检查是否安装了 pytest-cov
        if ! python -c "import pytest_cov" &> /dev/null; then
            echo -e "${YELLOW}⚠️  pytest-cov 未安装，正在安装...${NC}"
            pip install pytest-cov
        fi
        
        pytest apps/scan/orchestrators/test/test_dag_orchestrator.py \
            --cov=apps.scan.orchestrators.dag_orchestrator \
            --cov-report=html \
            --cov-report=term-missing \
            -v
        
        echo ""
        echo -e "${GREEN}✓ 覆盖率报告已生成${NC}"
        echo -e "${YELLOW}HTML 报告位置: $PROJECT_ROOT/htmlcov/index.html${NC}"
        ;;
    
    "verbose")
        echo -e "${BLUE}📋 运行所有测试（详细输出）...${NC}"
        echo ""
        pytest apps/scan/orchestrators/test/test_dag_orchestrator.py -v -s
        ;;
    
    "help"|"-h"|"--help")
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  all          运行所有测试（默认）"
        echo "  workflow     运行工作流编排测试"
        echo "  tasks        运行任务构建测试"
        echo "  deps         运行依赖关系测试"
        echo "  stages       运行拓扑排序测试"
        echo "  coverage     运行测试并生成覆盖率报告"
        echo "  verbose      运行所有测试（详细输出）"
        echo "  help         显示此帮助信息"
        echo ""
        echo "示例:"
        echo "  $0              # 运行所有测试"
        echo "  $0 workflow     # 只运行工作流测试"
        echo "  $0 coverage     # 生成覆盖率报告"
        exit 0
        ;;
    
    *)
        echo -e "${RED}❌ 未知选项: $1${NC}"
        echo -e "${YELLOW}运行 '$0 help' 查看可用选项${NC}"
        exit 1
        ;;
esac

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ 测试运行完成${NC}"
echo -e "${BLUE}========================================${NC}"

