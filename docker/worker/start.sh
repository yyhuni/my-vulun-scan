#!/bin/bash
set -e

echo "🚀 启动 XingRin Worker..."

# 设置 Prefect API URL（可被环境变量覆盖）
PREFECT_API_URL=${PREFECT_API_URL:-http://server:4200/api}
export PREFECT_API_URL

# 1. 等待 Prefect Server 就绪
echo "  [1/2] 等待 Prefect Server 就绪..."
until curl -s "${PREFECT_API_URL}/health" > /dev/null 2>&1; do
    echo "  Prefect Server 尚未就绪，等待中..."
    sleep 5
done
echo "  ✓ Prefect Server 已就绪"

# 2. 确保 Work Pool 存在
# 通过 PREFECT_WORK_POOL_NAME 指定当前 Worker 要连接的池（例如 scan-pool / maintenance-pool）
if [ -z "${PREFECT_WORK_POOL_NAME}" ]; then
    echo "  ❌ 未设置 PREFECT_WORK_POOL_NAME，无法确定要连接的 Work Pool（例如 scan-pool / maintenance-pool）"
    exit 1
fi
POOL_NAME=${PREFECT_WORK_POOL_NAME}
echo "  [2/2] 检查 Work Pool: ${POOL_NAME}..."

# 尝试创建 Work Pool，如果已存在会忽略（或者报错但我们可以忽略报错，因为只要存在就行）
# 使用 process 类型，因为我们在容器内直接运行任务
prefect work-pool create "${POOL_NAME}" --type process --overwrite || true
echo "  ✓ Work Pool 就绪"

# 3. 启动 Worker
echo "  🚀 启动 Worker 进程..."
# 设置并发限制：每个 Worker 最多同时处理的任务数
WORKER_LIMIT=${WORKER_LIMIT:-5}
echo "  Worker 并发限制: ${WORKER_LIMIT}"
exec prefect worker start --pool "${POOL_NAME}" --limit "${WORKER_LIMIT}"
