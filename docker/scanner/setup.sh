#!/bin/bash

# XingRin Docker 环境初始化脚本

set -e

echo "=========================================="
echo "初始化 XingRin Docker 环境"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"

# 创建必要的目录
echo ""
echo "创建必要的目录..."
mkdir -p workspace
mkdir -p tools
mkdir -p output
mkdir -p config
mkdir -p wordlists
mkdir -p scripts

echo -e "${GREEN}✓ 目录创建完成${NC}"

# 复制环境变量配置文件
if [ ! -f .env ]; then
    echo ""
    echo "创建环境变量配置文件..."
    cp .env.example .env
    echo -e "${YELLOW}! 请编辑 .env 文件配置您的环境变量${NC}"
else
    echo -e "${YELLOW}! .env 文件已存在，跳过创建${NC}"
fi

# 询问是否立即构建镜像
echo ""
read -p "是否现在构建 Docker 镜像？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    
    echo "开始构建镜像..."
    docker-compose build
    echo -e "${GREEN}✓ 镜像构建完成${NC}"
    
    # 询问是否启动容器
    echo ""
    read -p "是否现在启动容器？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "启动容器..."
        docker-compose up -d
        echo -e "${GREEN}✓ 容器启动完成${NC}"
        echo ""
        echo "使用以下命令进入容器："
        echo "  docker-compose exec xingrin bash"
    fi
fi

echo ""
echo "=========================================="
echo -e "${GREEN}初始化完成！${NC}"
echo "=========================================="
echo ""
echo "常用命令："
echo "  docker-compose up -d          # 启动容器"
echo "  docker-compose down           # 停止容器"
echo "  docker-compose logs -f        # 查看日志"
echo "  docker-compose exec xingrin bash  # 进入容器"
echo ""
echo "详细文档请查看 README.md"
echo ""
