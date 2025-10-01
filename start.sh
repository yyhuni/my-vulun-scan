#!/bin/bash

# Vulun Scan 项目启动脚本
# 支持同时启动前端和后端服务

set -e

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/front"
BACKEND_DIR="$SCRIPT_DIR/backend"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Vulun Scan 项目启动脚本"
    echo ""
    echo "用法:"
    echo "  $0 [选项]"
    echo ""
    echo "选项:"
    echo "  frontend    只启动前端服务"
    echo "  backend     只启动后端服务"
    echo "  all         同时启动前后端服务 (默认)"
    echo "  dev         开发模式，同时启动前后端 (带热重载)"
    echo "  build       构建后端二进制文件"
    echo "  help        显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 all      # 同时启动前后端"
    echo "  $0 dev      # 开发模式启动"
    echo "  $0 frontend # 只启动前端"
}

# 检查系统环境
check_environment() {
    log_step "检查系统环境..."

    # 检查 Node.js 和 pnpm
    if [[ "$1" == "frontend" || "$1" == "all" || "$1" == "dev" ]]; then
        check_command "node"
        check_command "pnpm"
        log_info "Node.js 版本: $(node --version)"
        log_info "pnpm 版本: $(pnpm --version)"
    fi

    # 检查 Go
    if [[ "$1" == "backend" || "$1" == "all" || "$1" == "dev" ]]; then
        check_command "go"
        log_info "Go 版本: $(go version)"
    fi

    # 检查 PostgreSQL (可选)
    if command -v psql &> /dev/null; then
        log_info "PostgreSQL 已安装"
    else
        log_warn "PostgreSQL 未安装，将使用 Docker 数据库"
    fi
}

# 初始化后端
init_backend() {
    log_step "初始化后端..."

    cd "$BACKEND_DIR"

    # 下载依赖
    log_info "下载 Go 依赖..."
    go mod download
    go mod tidy

    # 检查配置文件
    if [ ! -f "config/config.yaml" ]; then
        log_warn "配置文件不存在，创建默认配置..."
        cp config/config.yaml.example config/config.yaml 2>/dev/null || {
            log_error "配置文件模板不存在，请手动创建 config/config.yaml"
            exit 1
        }
    fi

    # 生成 Swagger 文档
    log_info "生成 Swagger 文档..."
    SWAG_BIN="$(go env GOPATH)/bin/swag"
    if [ -f "$SWAG_BIN" ]; then
        $SWAG_BIN init -g cmd/main.go -o docs --parseDependency --parseInternal
        log_info "Swagger 文档生成完成"
    elif command -v swag &> /dev/null; then
        swag init -g cmd/main.go -o docs --parseDependency --parseInternal
        log_info "Swagger 文档生成完成"
    else
        log_warn "swag 命令未找到，跳过 Swagger 生成"
        log_warn "安装命令: go install github.com/swaggo/swag/cmd/swag@latest"
    fi

    log_info "后端初始化完成"
}

# 初始化前端
init_frontend() {
    log_step "初始化前端..."

    cd "$FRONTEND_DIR"

    # 安装依赖
    log_info "安装前端依赖..."
    pnpm install

    log_info "前端初始化完成"
}

# 启动后端服务
start_backend() {
    log_step "启动后端服务..."

    cd "$BACKEND_DIR"

    if [[ "$1" == "dev" ]]; then
        # 开发模式 - 使用 Docker Compose (如果存在)
        if [ -f "docker-compose.yml" ]; then
            log_info "使用 Docker Compose 启动后端 (开发模式)"
            docker-compose up -d
        else
            # 直接运行 Go 应用
            log_info "直接启动 Go 应用 (开发模式)"
            go run cmd/main.go
        fi
    else
        # 生产模式
        log_info "构建并启动后端服务..."
        go build -o bin/server cmd/main.go
        ./bin/server
    fi
}

# 启动前端服务
start_frontend() {
    log_step "启动前端服务..."

    cd "$FRONTEND_DIR"

    if [[ "$1" == "dev" ]]; then
        log_info "启动前端开发服务器..."
        pnpm run dev
    else
        log_info "构建并启动前端服务..."
        pnpm run build
        pnpm run start
    fi
}

# 同时启动前后端
start_all() {
    log_step "同时启动前后端服务..."

    # 检查 concurrently 是否安装
    if ! command -v concurrently &> /dev/null; then
        log_warn "concurrently 未安装，使用后台进程模式"
        start_all_background "$1"
        return
    fi

    cd "$FRONTEND_DIR"

    if [[ "$1" == "dev" ]]; then
        log_info "开发模式: 同时启动前后端服务"
        concurrently \
            --names "frontend,backend" \
            -c "bgBlue.bold,bgMagenta.bold" \
            --kill-others \
            "pnpm run dev" \
            "cd ../backend && go run cmd/main.go"
    else
        log_info "生产模式: 同时启动前后端服务"
        concurrently \
            --names "frontend,backend" \
            -c "bgBlue.bold,bgMagenta.bold" \
            --kill-others \
            "pnpm run build && pnpm run start" \
            "cd ../backend && go build -o bin/server cmd/main.go && ./bin/server"
    fi
}

# 后台进程模式启动
start_all_background() {
    log_step "使用后台进程模式启动服务..."

    # 启动后端
    log_info "启动后端服务..."
    cd "$BACKEND_DIR"
    if [[ "$1" == "dev" ]]; then
        go run cmd/main.go &
        BACKEND_PID=$!
    else
        go build -o bin/server cmd/main.go
        ./bin/server &
        BACKEND_PID=$!
    fi

    # 等待一下让后端启动
    sleep 3

    # 启动前端
    log_info "启动前端服务..."
    cd "$FRONTEND_DIR"
    if [[ "$1" == "dev" ]]; then
        pnpm run dev &
        FRONTEND_PID=$!
    else
        pnpm run build
        pnpm run start &
        FRONTEND_PID=$!
    fi

    log_info "服务已启动!"
    log_info "后端 PID: $BACKEND_PID"
    log_info "前端 PID: $FRONTEND_PID"
    log_info "按 Ctrl+C 停止所有服务"

    # 等待用户中断
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
}

# 构建后端
build_backend() {
    log_step "构建后端..."

    cd "$BACKEND_DIR"

    log_info "构建 Go 二进制文件..."
    go build -o bin/server cmd/main.go

    if [ -f "bin/server" ]; then
        log_info "构建成功: bin/server"
        ls -la bin/server
    else
        log_error "构建失败"
        exit 1
    fi
}

# 主函数
main() {
    local mode="${1:-all}"

    echo -e "${CYAN}"
    echo "=========================================="
    echo "     Vulun Scan 项目启动器"
    echo "=========================================="
    echo -e "${NC}"

    case "$mode" in
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        "frontend")
            check_environment "frontend"
            init_frontend
            start_frontend "$mode"
            ;;
        "backend")
            check_environment "backend"
            init_backend
            start_backend "$mode"
            ;;
        "all")
            check_environment "all"
            init_backend
            init_frontend
            start_all
            ;;
        "dev")
            check_environment "all"
            init_backend
            init_frontend
            start_all "dev"
            ;;
        "build")
            check_environment "backend"
            init_backend
            build_backend
            ;;
        *)
            log_error "无效的选项: $mode"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# 如果脚本被直接调用，执行主函数
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
