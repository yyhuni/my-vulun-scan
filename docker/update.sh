#!/bin/bash
#
# 生产环境更新脚本
#
# 使用方式：
#   ./update.sh              # 执行所有更新
#   ./update.sh --no-pull    # 不拉取代码
#   ./update.sh --rebuild    # 强制重建镜像
#   ./update.sh --help       # 显示帮助
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$SCRIPT_DIR"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

LOCK_FILE="/tmp/vulnscan_update.lock"
LOG_DIR="$SCRIPT_DIR/logs"
UPDATE_LOG="$LOG_DIR/update_$(date +%Y%m%d_%H%M%S).log"

show_help() {
    echo "生产环境更新脚本"
    echo ""
    echo "用法: ./update.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --no-pull       不拉取 Git 代码"
    echo "  --rebuild       强制重建 Docker 镜像"
    echo "  --no-backup     跳过数据库备份"
    echo "  --force-config  强制覆盖引擎配置（不询问）"
    echo "  -y, --yes       自动模式（跳过所有询问，不覆盖已有配置）"
    echo "  --help          显示此帮助信息"
    echo ""
    echo "执行步骤:"
    echo "  1. 前置检查（磁盘空间、Docker 状态）"
    echo "  2. 拉取最新代码（可选）"
    echo "  3. 备份数据库"
    echo "  4. 检测依赖变更，必要时重建镜像"
    echo "  5. 执行数据库迁移"
    echo "  6. 更新引擎配置"
    echo "  7. 初始化字典"
    echo "  8. 初始化 Nuclei 模板仓库"
    echo "  9. 初始化 admin 用户"
    echo "  10. 注册 Prefect Deployments"
    echo "  11. 重启服务"
}

# 创建锁，防止重复执行
acquire_lock() {
    if [ -f "$LOCK_FILE" ]; then
        log_error "更新正在进行中，请稍后重试"
        exit 1
    fi
    echo $$ > "$LOCK_FILE"
    trap "rm -f $LOCK_FILE" EXIT
}

# 前置检查
pre_check() {
    log_step "1. 前置检查..."
    
    # 检查磁盘空间（至少需要 1GB）
    local available=$(df -BG "$SCRIPT_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [ "$available" -lt 1 ]; then
        log_error "磁盘空间不足，至少需要 1GB"
        exit 1
    fi
    log_info "磁盘空间: ${available}GB 可用"
    
    # 检查 Docker
    if ! docker info &>/dev/null; then
        log_error "Docker 未运行"
        exit 1
    fi
    log_info "Docker 状态正常"
}

# 拉取代码
git_pull() {
    log_step "2. 拉取最新代码..."
    cd "$PROJECT_ROOT"
    
    # 保存当前 commit
    local before_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    git pull --rebase
    
    local after_commit=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    
    if [ "$before_commit" != "$after_commit" ]; then
        log_info "代码已更新: ${before_commit:0:8} -> ${after_commit:0:8}"
    else
        log_info "代码已是最新"
    fi
    
    cd "$SCRIPT_DIR"
}

# 备份数据库
backup_database() {
    log_step "3. 备份数据库..."
    
    local backup_dir="$SCRIPT_DIR/backups"
    mkdir -p "$backup_dir"
    
    local backup_file="$backup_dir/db_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # 使用 docker compose exec 备份 PostgreSQL
    if docker compose exec -T postgres pg_dump -U vulnscan vulnscan > "$backup_file" 2>/dev/null; then
        log_info "数据库备份完成: $backup_file"
        
        # 只保留最近 5 个备份
        ls -t "$backup_dir"/db_backup_*.sql 2>/dev/null | tail -n +6 | xargs -r rm
    else
        log_warn "数据库备份失败，继续更新..."
    fi
}

# 检测依赖变更并重建镜像
check_and_rebuild() {
    log_step "4. 检测依赖变更..."
    
    local need_rebuild=false
    
    # 检查 requirements.txt 是否有变更
    if git diff HEAD~1 --name-only 2>/dev/null | grep -q "requirements.txt"; then
        log_warn "检测到 requirements.txt 变更"
        need_rebuild=true
    fi
    
    # 检查 Dockerfile 是否有变更
    if git diff HEAD~1 --name-only 2>/dev/null | grep -q "Dockerfile"; then
        log_warn "检测到 Dockerfile 变更"
        need_rebuild=true
    fi
    
    if [ "$FORCE_REBUILD" = true ] || [ "$need_rebuild" = true ]; then
        log_info "重建 Docker 镜像..."
        docker compose build
    else
        log_info "无需重建镜像"
    fi
}

# 执行数据库迁移
run_migrations() {
    log_step "5. 执行数据库迁移..."
    docker compose exec -T server python backend/manage.py migrate --noinput
    log_info "数据库迁移完成"
}

# 更新引擎配置
update_engine_config() {
    log_step "6. 检查引擎配置..."
    
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
        elif [ "$AUTO_YES" = "true" ]; then
            log_info "已有配置，自动模式下跳过覆盖"
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
    log_step "7. 初始化字典..."
    docker compose exec -T server python backend/manage.py init_wordlists
    log_info "字典初始化完成"
}

# 初始化 Nuclei 模板仓库
init_nuclei_templates() {
    log_step "8. 初始化 Nuclei 模板仓库..."
    docker compose exec -T server python backend/manage.py init_nuclei_templates --sync
    log_info "Nuclei 模板仓库初始化完成"
}

# 初始化 admin 用户
init_admin_user() {
    log_step "9. 初始化 admin 用户..."
    docker compose exec -T server python backend/manage.py init_admin
    log_info "admin 用户初始化完成"
}

# 注册 Prefect Deployments
register_deployments() {
    log_step "10. 注册 Prefect Deployments..."
    docker compose exec -T -w /app/backend server python -m apps.scan.deployments.register
    docker compose exec -T -w /app/backend server python -m apps.targets.deployments.register
    docker compose exec -T -w /app/backend server python -m apps.asset.deployments.register
    log_info "Prefect Deployments 注册完成"
}

# 重启服务
restart_services() {
    log_step "11. 重启服务..."
    ./restart.sh
    log_info "服务重启完成"
}

# 主函数
main() {
    local no_pull=false
    local no_backup=false
    FORCE_REBUILD=false
    FORCE_CONFIG=false
    AUTO_YES=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-pull) no_pull=true; shift ;;
            --rebuild) FORCE_REBUILD=true; shift ;;
            --no-backup) no_backup=true; shift ;;
            --force-config) FORCE_CONFIG=true; shift ;;
            -y|--yes) AUTO_YES=true; shift ;;
            --help) show_help; exit 0 ;;
            *) log_error "未知选项: $1"; show_help; exit 1 ;;
        esac
    done

    echo "========================================"
    echo "     生产环境更新脚本"
    echo "========================================"
    echo ""

    # 创建日志目录
    mkdir -p "$LOG_DIR"

    acquire_lock
    
    # 执行更新步骤
    pre_check
    
    if [ "$no_pull" = false ]; then
        git_pull
    else
        log_step "2. 跳过代码拉取"
    fi
    
    if [ "$no_backup" = false ]; then
        backup_database
    else
        log_step "3. 跳过数据库备份"
    fi
    
    check_and_rebuild
    run_migrations
    update_engine_config
    init_wordlists
    init_nuclei_templates
    init_admin_user
    register_deployments
    restart_services

    echo ""
    log_info "✅ 生产环境更新完成!"
    log_info "日志位置: $UPDATE_LOG"
}

main "$@" 2>&1 | tee -a "$UPDATE_LOG"
