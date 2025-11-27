#!/bin/bash
# ============================================
# XingRin Watchdog 服务安装脚本
# 用途：安装 Watchdog 守护进程（Systemd 服务）
# 支持：Ubuntu / Debian
# 变量：{{WATCHDOG_SCRIPT}} - watchdog.sh 内容
# ============================================

# 1. 创建目录
sudo mkdir -p /opt/xingrin/bin

# 2. 写入脚本文件
sudo tee /opt/xingrin/bin/watchdog.sh > /dev/null << 'EOF'
{{WATCHDOG_SCRIPT}}
EOF
sudo chmod +x /opt/xingrin/bin/watchdog.sh

# 3. 创建 Systemd 服务
sudo tee /etc/systemd/system/xingrin-watchdog.service > /dev/null << EOF
[Unit]
Description=XingRin Worker Watchdog
After=docker.service network.target
Requires=docker.service

[Service]
Type=simple
ExecStart=/bin/bash /opt/xingrin/bin/watchdog.sh
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

# 4. 启动服务
sudo systemctl daemon-reload
sudo systemctl enable xingrin-watchdog
sudo systemctl restart xingrin-watchdog

echo "Watchdog 服务已安装并启动"
