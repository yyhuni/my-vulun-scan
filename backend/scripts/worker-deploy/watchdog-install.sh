#!/bin/bash
# ============================================
# XingRin Watchdog 服务安装脚本
# 用途：安装 Watchdog 为 Systemd 服务
# 适用：Worker VPS
# ============================================

set -e

# 配置
MARKER_DIR="/opt/xingrin"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

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

log_info "=========================================="
log_info "  XingRin Watchdog 服务安装"
log_info "=========================================="

# 1. 创建目录
log_info "创建目录..."
sudo mkdir -p ${MARKER_DIR}/bin

# 2. 复制 watchdog 脚本
log_info "复制 watchdog 脚本..."
sudo cp "${SCRIPT_DIR}/watchdog.sh" ${MARKER_DIR}/bin/watchdog.sh
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
