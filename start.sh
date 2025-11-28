#!/bin/bash
# 启动服务（Docker 部署）
cd "$(dirname "$0")"
exec ./docker/start.sh
