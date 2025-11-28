#!/bin/bash
# 停止服务（Docker 部署）
cd "$(dirname "$0")"
exec ./docker/stop.sh
