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

# 2. 迁移数据库
echo "  [2/4] 检查数据库迁移..."
cd /app/backend
python manage.py migrate --noinput
echo "  ✓ 数据库迁移完成"

# 3. 注册 Prefect Deployments
echo "  [3/4] 注册 Prefect Deployments..."

# 扫描任务
echo "    - 注册扫描任务..."
python -m apps.scan.deployments.initiate_scan_deployment
# 清理任务
echo "    - 注册清理任务..."
python -m apps.scan.deployments.cleanup_deployment
# 删除任务
echo "    - 注册删除任务..."
python -m apps.targets.deployments.register

echo "  ✓ Deployments 注册完成"

# 4. 启动 Django Daphne 服务
echo "  [4/4] 启动 Django Daphne..."
cd /app/backend
daphne -b 0.0.0.0 -p 8888 config.asgi:application
