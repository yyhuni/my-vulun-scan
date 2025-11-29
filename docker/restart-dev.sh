#!/bin/bash
# 开发环境重启脚本（代码挂载，修改后重启即可生效）

cd "$(dirname "$0")"
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart
echo "✅ 开发环境已重启（代码已挂载）"
