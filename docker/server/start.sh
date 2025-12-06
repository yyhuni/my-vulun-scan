#!/bin/bash
set -e

echo "🚀 启动 XingRin Server..."

# 1. 启动 Prefect Server (后台)
echo "  [1/4] 启动 Prefect Server..."
prefect server start --host 0.0.0.0 --port 4200 &

# 等待 Prefect Server 启动
echo "  等待 Prefect Server 就绪..."
sleep 10

# 检查 Prefect Server 是否就绪
until curl -s http://localhost:4200/api/health > /dev/null 2>&1; do
    echo "  Prefect Server 尚未就绪，等待中..."
    sleep 2
done
echo "  ✓ Prefect Server 已就绪"

# 2. 生成和迁移数据库
echo "  [2/4] 生成数据库迁移文件..."
cd /app/backend
python manage.py makemigrations
echo "  ✓ 迁移文件生成完成"

echo "  [2.1/4] 执行数据库迁移..."
python manage.py migrate --noinput
echo "  ✓ 数据库迁移完成"

echo "  [2.2/4] 初始化默认扫描引擎..."
python manage.py init_default_engine
echo "  ✓ 默认扫描引擎已就绪"

echo "  [2.3/4] 初始化默认目录字典..."
python manage.py init_wordlists
echo "  ✓ 默认目录字典已就绪"

# 2.5 创建 Work Pools
echo "  [2.5/4] 创建 Prefect Work Pools..."
SCAN_POOL_NAME=${PREFECT_SCAN_WORK_POOL_NAME:-scan-pool}
MAINTENANCE_POOL_NAME=${PREFECT_MAINTENANCE_WORK_POOL_NAME:-maintenance-pool}
prefect work-pool create "$SCAN_POOL_NAME" --type process --overwrite || true
prefect work-pool create "$MAINTENANCE_POOL_NAME" --type process --overwrite || true
echo "  ✓ Work Pools 已就绪"

# 3. 注册 Prefect Deployments（需在 /app/backend 目录下执行）
echo "  [3/4] 注册 Prefect Deployments..."
cd /app/backend

# Scan 相关部署（扫描、清理、删除）
echo "    - 注册 Scan Deployments..."
python -m apps.scan.deployments.register
# Targets 删除任务
echo "    - 注册 Targets 删除任务..."
python -m apps.targets.deployments.register
# Asset 统计任务
echo "    - 注册 Asset 统计任务..."
python -m apps.asset.deployments.register

echo "  ✓ Deployments 注册完成"

# 4. 启动 Django uvicorn 服务 (ASGI)
echo "  [4/4] 启动 Django uvicorn (ASGI)..."
cd /app/backend
uvicorn config.asgi:application --host 0.0.0.0 --port 8888
