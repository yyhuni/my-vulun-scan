#!/bin/bash
set -e

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "========================================"
echo "  XingRin 项目安装 / 初始化脚本"
echo "========================================"
echo

# 简单的命令检查函数
check_cmd() {
    local name="$1"
    local hint="$2"
    if command -v "$name" >/dev/null 2>&1; then
        echo "✅ 已安装: $name"
    else
        echo "⚠️ 未检测到: $name"
        if [ -n "$hint" ]; then
            echo "   建议安装方式: $hint"
        fi
    fi
}

OS_NAME="$(uname -s)"
case "$OS_NAME" in
    Darwin)
        OS_DESC="macOS"
        ;;
    Linux)
        OS_DESC="Linux/Ubuntu"
        ;;
    *)
        OS_DESC="$OS_NAME (未知/未适配系统)"
        ;;
esac

echo "当前系统: $OS_DESC"
echo

# 生成随机字符串（优先使用 openssl，其次 python3，最后使用 sha256sum）
generate_random_string() {
    local length="${1:-32}"
    if command -v openssl >/dev/null 2>&1; then
        # openssl rand -hex 会返回 2*length 字符，这里裁剪
        openssl rand -hex "$length" 2>/dev/null | cut -c1-"$length"
    elif command -v python3 >/dev/null 2>&1; then
        python3 - <<PY
import secrets, string
alphabet = string.ascii_letters + string.digits
print(''.join(secrets.choice(alphabet) for _ in range($length)))
PY
    else
        # 兜底方案（主要面向 Linux/Ubuntu）
        if command -v sha256sum >/dev/null 2>&1; then
            date +%s%N | sha256sum | cut -c1-"$length"
        else
            date +%s%N | shasum | cut -c1-"$length"
        fi
    fi
}

# 更新 .env 文件中的某个键（兼容 macOS 和 Linux 的 sed -i 行为）
update_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"

    if grep -q "^$key=" "$file"; then
        if [ "$OS_NAME" = "Darwin" ]; then
            sed -i '' -e "s|^$key=.*|$key=$value|" "$file"
        else
            sed -i -e "s|^$key=.*|$key=$value|" "$file"
        fi
    else
        echo "$key=$value" >> "$file"
    fi
}

# 自动为 docker/.env 填充敏感变量
auto_fill_docker_env_secrets() {
    local env_file="$1"
    echo "   自动生成 DJANGO_SECRET_KEY 和 DB_PASSWORD..."
    local django_key db_pass
    django_key="$(generate_random_string 64)"
    db_pass="$(generate_random_string 32)"

    update_env_var "$env_file" "DJANGO_SECRET_KEY" "$django_key"
    update_env_var "$env_file" "DB_PASSWORD" "$db_pass"
}

echo "[1/3] 检查基础命令..."
check_cmd "git"   "Ubuntu: sudo apt install git；macOS: brew install git 或 xcode-select --install"
check_cmd "tmux"  "Ubuntu: sudo apt install tmux；macOS: brew install tmux"
check_cmd "curl"  "Ubuntu/macOS 一般自带，如无请使用包管理器（apt/brew）安装"
check_cmd "jq"    "Ubuntu: sudo apt install jq；macOS: brew install jq"
echo

echo "[2/3] 检查 Docker 环境 (仅提示，不自动安装)..."
if command -v docker >/dev/null 2>&1; then
    echo "✅ 已检测到 docker 命令"
else
    echo "❌ 未检测到 docker 命令。"
    if [ "$OS_NAME" = "Darwin" ]; then
        echo "   请安装 Docker Desktop for Mac: https://www.docker.com/products/docker-desktop/"
    else
        echo "   请参考官方文档安装 Docker: https://docs.docker.com/engine/install/"
    fi
fi

echo
if command -v docker-compose >/dev/null 2>&1; then
    echo "✅ 已检测到 docker-compose 命令"
elif docker compose version >/dev/null 2>&1; then
    echo "✅ 已检测到 docker compose 子命令"
else
    echo "⚠️ 未检测到 docker-compose 或 docker compose。"
    echo "   如使用 Docker Desktop，一般会自带 docker compose；否则请参考: https://docs.docker.com/compose/install/"
fi

echo

echo "[3/3] 初始化 docker/.env 配置..."
DOCKER_DIR="$ROOT_DIR/docker"
if [ ! -d "$DOCKER_DIR" ]; then
    echo "❌ 未找到 docker 目录（期望路径: $DOCKER_DIR），请确认项目结构。"
else
    if [ -f "$DOCKER_DIR/.env" ]; then
        echo "✅ 检测到已存在: docker/.env"
        read -r -p "是否备份并重新从 .env.example 生成新的 docker/.env？[y/N]: " REGEN
        case "$REGEN" in
            [yY]*)
                if [ -f "$DOCKER_DIR/.env.example" ]; then
                    ts="$(date +%Y%m%d_%H%M%S)"
                    cp "$DOCKER_DIR/.env" "$DOCKER_DIR/.env.backup.$ts"
                    cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
                    auto_fill_docker_env_secrets "$DOCKER_DIR/.env"
                    echo "✅ 已备份原文件为 docker/.env.backup.$ts，并从 .env.example 生成新的 docker/.env。"
                    echo "   已为 docker/.env 自动生成新的随机密码和 Django 密钥，请根据实际生产环境检查并调整其他变量。"
                else
                    echo "⚠️ 未找到 docker/.env.example，无法自动生成新的 docker/.env。"
                fi
                ;;
            *)
                echo "   保留现有 docker/.env，不做修改。"
                ;;
        esac
    else
        if [ -f "$DOCKER_DIR/.env.example" ]; then
            echo "⚠️ 未检测到 docker/.env，正在从 docker/.env.example 创建..."
            cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
            auto_fill_docker_env_secrets "$DOCKER_DIR/.env"
            echo "✅ 已根据 docker/.env.example 生成 docker/.env，并自动生成随机密码和 Django 密钥。"
            echo "   请根据实际生产环境检查并修改其他变量（如数据库地址、Redis、允许的域名等）。"
        else
            echo "⚠️ 未找到 docker/.env.example，请先补齐示例文件或手动创建 docker/.env。"
        fi
    fi
fi

echo
echo "========================================"
echo "  初始化步骤完成"
echo "========================================"
echo
echo "下一步建议："
echo "1) 打开并检查 docker/.env，确认数据库、Redis、Django、Prefect 等配置是否正确。"
echo "2) 启动 Docker 部署："
echo "   cd docker && ./start.sh"
echo
echo "如果需要本地开发环境（非 Docker）："
echo "   source /Users/yangyang/Desktop/scanner/.venv/bin/activate"
echo "   cd backend && ./scripts/dev/start.sh"
echo
echo "完成以上配置后，即可在浏览器访问："
echo "   Prefect UI:  http://localhost:4200"
echo "   Django API:  http://localhost:8888"
