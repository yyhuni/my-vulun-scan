#!/bin/bash
# ============================================
# XingRin Worker Watchdog (看门狗)
# 用途：监控 Worker 容器状态并上报心跳
# 支持：Ubuntu / Debian
# ============================================

# 配置变量 (由部署脚本替换)
API_URL="{{API_URL}}"
WORKER_ID="{{WORKER_ID}}"
INTERVAL=30

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "${GREEN}Watchdog 启动...${NC}"
log "监控目标: xingrin-worker"
log "上报地址: ${API_URL}"
log "Worker ID: ${WORKER_ID}"

while true; do
    # 1. 检查容器是否运行
    if docker ps --filter "name=xingrin-worker" --filter "status=running" --format "{{.Names}}" | grep -q "xingrin-worker"; then
        
        # 2. 收集系统负载
        # CPU 使用率 (例如: 15%)
        CPU_USAGE=$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage "%"}' | cut -d. -f1)%
        
        # 内存使用 (例如: 2.1G/8G)
        MEM_USAGE=$(free -h | grep Mem | awk '{print $3 "/" $2}')
        
        # 磁盘使用 (例如: 45%)
        DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')

        # 3. 构建 JSON 数据
        JSON_DATA=$(cat <<EOF
{
    "cpu": "$CPU_USAGE",
    "memory": "$MEM_USAGE",
    "disk": "$DISK_USAGE"
}
EOF
)
        
        # 4. 发送心跳
        RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$JSON_DATA" \
            "${API_URL}/workers/${WORKER_ID}/heartbeat/")
            
        if [ "$RESPONSE" == "200" ]; then
            # 心跳成功 (为了不刷屏，只在首次或错误恢复后打印)
            # log "${GREEN}心跳发送成功${NC}"
            :
        else
            log "${YELLOW}心跳发送失败 (HTTP $RESPONSE)${NC}"
        fi

    else
        log "${RED}警告: xingrin-worker 容器未运行!${NC}"
        log "正在尝试自动重启..."
        
        if docker start xingrin-worker; then
            log "${GREEN}容器重启成功${NC}"
        else
            log "${RED}容器重启失败${NC}"
        fi
    fi

    # 休眠
    sleep $INTERVAL
done
