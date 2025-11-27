#!/bin/bash
set -e

# 项目根目录
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

echo "========================================"
echo "  XingRin 一键安装脚本 (Ubuntu)"
echo "========================================"
echo

# 生成随机字符串
generate_random_string() {
    local length="${1:-32}"
    if command -v openssl >/dev/null 2>&1; then
        openssl rand -hex "$length" 2>/dev/null | cut -c1-"$length"
    else
        date +%s%N | sha256sum | cut -c1-"$length"
    fi
}

# 更新 .env 文件中的某个键
update_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    if grep -q "^$key=" "$file"; then
        sed -i -e "s|^$key=.*|$key=$value|" "$file"
    else
        echo "$key=$value" >> "$file"
    fi
}

# 用于保存生成的密码，方便最后显示
GENERATED_DB_PASSWORD=""
GENERATED_DJANGO_KEY=""

# 自动为 docker/.env 填充敏感变量
auto_fill_docker_env_secrets() {
    local env_file="$1"
    echo "   自动生成 DJANGO_SECRET_KEY 和 DB_PASSWORD..."
    GENERATED_DJANGO_KEY="$(generate_random_string 64)"
    GENERATED_DB_PASSWORD="$(generate_random_string 32)"
    update_env_var "$env_file" "DJANGO_SECRET_KEY" "$GENERATED_DJANGO_KEY"
    update_env_var "$env_file" "DB_PASSWORD" "$GENERATED_DB_PASSWORD"
}

echo "[1/3] 安装基础命令..."
MISSING_CMDS=()
for cmd in git tmux curl jq; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING_CMDS+=("$cmd")
    else
        echo "✅ 已安装: $cmd"
    fi
done

if [ ${#MISSING_CMDS[@]} -gt 0 ]; then
    echo "   正在安装: ${MISSING_CMDS[*]}..."
    sudo apt update -qq
    sudo apt install -y "${MISSING_CMDS[@]}"
    echo "✅ 基础命令安装完成"
fi
echo

echo "[2/3] 安装 Docker..."
if command -v docker >/dev/null 2>&1; then
    echo "✅ 已安装: docker"
else
    echo "   正在安装 Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER"
    echo "✅ Docker 安装完成"
    echo "⚠️ 已将当前用户加入 docker 组，安装完成后请执行: newgrp docker 或重新登录"
fi

# 检查 docker compose
if docker compose version >/dev/null 2>&1; then
    echo "✅ 已安装: docker compose"
else
    echo "   正在安装 docker-compose-plugin..."
    sudo apt install -y docker-compose-plugin
    echo "✅ docker compose 安装完成"
fi
echo

echo "[3/3] 初始化 docker/.env 配置..."
DOCKER_DIR="$ROOT_DIR/docker"
if [ ! -d "$DOCKER_DIR" ]; then
    echo "❌ 未找到 docker 目录，请确认项目结构。"
    exit 1
fi

if [ -f "$DOCKER_DIR/.env" ]; then
    echo "✅ 已存在: docker/.env（保留现有配置）"
else
    if [ -f "$DOCKER_DIR/.env.example" ]; then
        cp "$DOCKER_DIR/.env.example" "$DOCKER_DIR/.env"
        auto_fill_docker_env_secrets "$DOCKER_DIR/.env"
        echo "✅ 已生成 docker/.env 并自动填充随机密码"
    else
        echo "❌ 未找到 docker/.env.example"
        exit 1
    fi
fi

echo
echo "========================================"
echo "  ✅ 安装完成"
echo "========================================"
echo

# 显示生成的账号密码
if [ -n "$GENERATED_DB_PASSWORD" ]; then
    echo "生成的配置信息："
    echo "----------------------------------------"
    echo "  数据库用户:     postgres"
    echo "  数据库密码:     $GENERATED_DB_PASSWORD"
    echo "  Django 密钥:   ${GENERATED_DJANGO_KEY:0:16}...（已保存到 docker/.env）"
    echo "----------------------------------------"
    echo
fi

echo "启动服务："
echo "   cd docker && ./start.sh"
echo
echo "访问地址："
echo "   Prefect UI:  http://localhost:4200"
echo "   Django API:  http://localhost:8888"
echo
echo "如果 docker 命令报权限错误，请先执行: newgrp docker 或重新登录"
