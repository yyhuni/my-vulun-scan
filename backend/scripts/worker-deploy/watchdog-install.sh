#!/bin/bash
# ============================================
# XingRin Watchdog 服务安装脚本
# 用途：安装 Watchdog 为 Systemd 服务
# 适用：Worker VPS
# ============================================

set -e

# 配置
MARKER_DIR="/opt/xingrin"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[XingRin]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[XingRin]${NC} $1"
}

is_watchdog_healthy() {
    # 基本文件存在检查
    if [ ! -f "${MARKER_DIR}/bin/watchdog.sh" ]; then
        return 1
    fi
    if [ ! -f "/etc/systemd/system/xingrin-watchdog.service" ]; then
        return 1
    fi

    # systemd 状态检查
    if ! sudo systemctl is-enabled xingrin-watchdog >/dev/null 2>&1; then
        return 1
    fi
    if ! sudo systemctl is-active xingrin-watchdog >/dev/null 2>&1; then
        return 1
    fi

    return 0
}

log_info "=========================================="
log_info "  XingRin Watchdog 服务安装"
log_info "=========================================="

# 如果已安装且运行正常，则直接退出（幂等）
if is_watchdog_healthy; then
    log_info "检测到 Watchdog 已安装且运行正常，跳过安装"
    exit 0
fi

# 1. 创建目录
log_info "创建目录..."
sudo mkdir -p ${MARKER_DIR}/bin

# 2. 写入 watchdog 脚本（内容由 deploy_service.py 嵌入）
log_info "写入 watchdog 脚本..."
sudo tee ${MARKER_DIR}/bin/watchdog.sh > /dev/null << 'WATCHDOG_EOF'
{{WATCHDOG_SCRIPT_CONTENT}}
WATCHDOG_EOF
sudo chmod +x ${MARKER_DIR}/bin/watchdog.sh

# 3. 创建 Systemd 服务
log_info "创建 Systemd 服务..."
sudo tee /etc/systemd/system/xingrin-watchdog.service > /dev/null << EOF
[Unit]
Description=XingRin Worker Watchdog
After=docker.service network.target
Requires=docker.service

[Service]
Type=simple
Environment="HEARTBEAT_API_URL={{HEARTBEAT_API_URL}}" "WORKER_ID={{WORKER_ID}}"
ExecStart=/bin/bash ${MARKER_DIR}/bin/watchdog.sh
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

# 4. 启动服务
log_info "启动服务..."
sudo systemctl daemon-reload
sudo systemctl enable xingrin-watchdog
sudo systemctl restart xingrin-watchdog

if is_watchdog_healthy; then
    echo ""
    log_success "=========================================="
    log_success "  ✓ Watchdog 服务已安装并启动"
    log_success "=========================================="
    echo ""
    log_info "管理命令："
    echo "  - 查看状态: sudo systemctl status xingrin-watchdog"
    echo "  - 查看日志: sudo journalctl -u xingrin-watchdog -f"
    echo "  - 重启服务: sudo systemctl restart xingrin-watchdog"
    echo "  - 停止服务: sudo systemctl stop xingrin-watchdog"
else
    echo ""
    echo "[XingRin] Watchdog 安装后自检失败，请检查 systemctl 状态和日志" >&2
    exit 1
fi
