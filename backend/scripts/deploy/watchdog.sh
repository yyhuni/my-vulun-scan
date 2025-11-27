#!/bin/bash
# ============================================
# XingRin Worker Watchdog (看门狗)
# 用途：监控 Worker 容器状态，自动重启 + 上报心跳
# 适用：Worker VPS
# ============================================

# 配置
MARKER_DIR="/opt/xingrin"
SRC_DIR="${MARKER_DIR}/src"
ENV_FILE="${SRC_DIR}/backend/.env"
INTERVAL=30

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# 检测 Docker 命令
if docker info >/dev/null 2>&1; then
    DOCKER_CMD="docker"
else
    DOCKER_CMD="sudo docker"
fi

# 加载环境变量
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

# 获取配置
API_URL="${HEARTBEAT_API_URL:-}"
WORKER_ID="${WORKER_ID:-$(hostname)}"

log "${GREEN}Watchdog 启动...${NC}"
log "监控目标: xingrin-worker"
log "心跳间隔: ${INTERVAL}s"

if [ -n "$API_URL" ]; then
    log "上报地址: ${API_URL}"
    log "Worker ID: ${WORKER_ID}"
else
    log "${YELLOW}未配置心跳上报地址，仅监控容器状态${NC}"
fi

while true; do
    # 1. 检查容器是否运行
    if $DOCKER_CMD ps --filter "name=xingrin-worker" --filter "status=running" --format "{{.Names}}" | grep -q "xingrin-worker"; then
        
        # 2. 收集系统负载（如果需要上报）
        if [ -n "$API_URL" ]; then
            # CPU 使用率
            CPU_USAGE=$(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {printf "%.0f%%", usage}')
            
            # 内存使用
            MEM_USAGE=$(free -h | grep Mem | awk '{print $3 "/" $2}')
            
            # 磁盘使用
            DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}')

            # 3. 构建 JSON 数据
            JSON_DATA=$(cat <<EOF
{
    "worker_id": "$WORKER_ID",
    "status": "running",
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
                "${API_URL}/api/workers/${WORKER_ID}/heartbeat/" 2>/dev/null || echo "000")
                
            if [ "$RESPONSE" != "200" ] && [ "$RESPONSE" != "201" ]; then
                log "${YELLOW}心跳发送失败 (HTTP $RESPONSE)${NC}"
            fi
        fi

    else
        log "${RED}警告: xingrin-worker 容器未运行!${NC}"
        log "正在尝试自动重启..."
        
        if $DOCKER_CMD start xingrin-worker 2>/dev/null; then
            log "${GREEN}容器重启成功${NC}"
            
            # 上报重启事件
            if [ -n "$API_URL" ]; then
                curl -s -X POST \
                    -H "Content-Type: application/json" \
                    -d "{\"worker_id\": \"$WORKER_ID\", \"event\": \"restart\"}" \
                    "${API_URL}/api/workers/${WORKER_ID}/event/" 2>/dev/null || true
            fi
        else
            log "${RED}容器重启失败${NC}"
        fi
    fi

    # 休眠
    sleep $INTERVAL
done
