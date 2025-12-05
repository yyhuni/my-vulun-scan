#!/bin/bash
#
# 开发环境更新脚本
# 用于代码变更后执行必要的更新操作（迁移、配置、字典）
#
# 使用方式：
#   ./update-dev.sh          # 执行所有更新
#   ./update-dev.sh --help   # 显示帮助
#
# 注意：开发环境代码挂载，无需 git pull 或重建镜像
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo "开发环境更新脚本"
    echo ""
    echo "用法: ./update-dev.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --migrate-only     只执行数据库迁移"
    echo "  --config-only      只更新引擎配置"
    echo "  --wordlist-only    只初始化字典"
    echo "  --force-config     强制覆盖引擎配置（默认不覆盖用户修改）"
    echo "  --no-restart       更新后不重启服务"
    echo "  --help             显示此帮助信息"
    echo ""
    echo "默认行为: 执行所有更新并重启服务"
}

# 检查服务是否运行
check_service_running() {
    if ! docker compose ps --status running | grep -q "server"; then
        log_error "Server 服务未运行，请先启动服务: ./start-dev.sh"
        exit 1
    fi
}

# 执行数据库迁移（开发环境包含 makemigrations）
run_migrations() {
    log_info "检测并生成迁移文件..."
    docker compose exec -T server python backend/manage.py makemigrations --noinput
    
    log_info "执行数据库迁移..."
    docker compose exec -T server python backend/manage.py migrate --noinput
    log_info "数据库迁移完成"
}

# 更新引擎配置
update_engine_config() {
    log_info "检查引擎配置..."
    
    # 检查是否有配置
    local has_config=$(docker compose exec -T server python backend/manage.py shell -c "
from apps.engine.models import ScanEngine
engine = ScanEngine.objects.filter(is_default=True).first()
print('yes' if engine and engine.configuration and engine.configuration.strip() else 'no')
" 2>/dev/null | tr -d '\r\n')

    local do_update=false

    if [ "$has_config" = "yes" ]; then
        if [ "$FORCE_CONFIG" = "true" ]; then
            do_update=true
        else
            echo -e "${YELLOW}检测到默认引擎已有配置${NC}"
            read -p "是否用最新配置覆盖？[y/N]: " answer
            if [[ "$answer" =~ ^[Yy]$ ]]; then
                do_update=true
            else
                log_info "保留现有配置"
            fi
        fi
    else
        do_update=true
    fi

    if [ "$do_update" = "true" ]; then
        docker compose exec -T server python backend/manage.py shell -c "
from apps.engine.models import ScanEngine
from pathlib import Path

yaml_path = Path('/app/backend/apps/scan/configs/engine_config_example.yaml')
if yaml_path.exists():
    engine = ScanEngine.objects.filter(is_default=True).first()
    if engine:
        engine.configuration = yaml_path.read_text()
        engine.save(update_fields=['configuration', 'updated_at'])
        print(f'已更新默认引擎配置: {engine.name}')
"
        log_info "引擎配置更新完成"
    fi
}

# 初始化字典
init_wordlists() {
    log_info "初始化/更新字典..."
    docker compose exec -T server python backend/manage.py init_wordlists
    log_info "字典初始化完成"
}

# 初始化 Nuclei 模板仓库
init_nuclei_templates() {
    log_info "初始化 Nuclei 模板仓库..."
    docker compose exec -T server python backend/manage.py init_nuclei_templates --sync
    log_info "Nuclei 模板仓库初始化完成"
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    ./restart-dev.sh
    log_info "服务重启完成"
}

# 主函数
main() {
    local migrate_only=false
    local config_only=false
    local wordlist_only=false
    local no_restart=false
    FORCE_CONFIG=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --migrate-only)
                migrate_only=true
                shift
                ;;
            --config-only)
                config_only=true
                shift
                ;;
            --wordlist-only)
                wordlist_only=true
                shift
                ;;
            --no-restart)
                no_restart=true
                shift
                ;;
            --force-config)
                FORCE_CONFIG=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    echo "========================================"
    echo "      开发环境更新脚本"
    echo "========================================"
    echo ""

    check_service_running

    # 根据参数执行对应操作
    if $migrate_only; then
        run_migrations
    elif $config_only; then
        update_engine_config
    elif $wordlist_only; then
        init_wordlists
    else
        # 执行所有更新
        run_migrations
        update_engine_config
        init_wordlists
        init_nuclei_templates

        if ! $no_restart; then
            restart_services
        fi
    fi

    echo ""
    log_info "✅ 更新完成!"
}

main "$@"
