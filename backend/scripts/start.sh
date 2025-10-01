#!/bin/bash

# Vulun Scan Backend 启动脚本

set -e

echo "🚀 Starting Vulun Scan Backend..."

# 检查 Go 是否安装
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21+ first."
    exit 1
fi

# 检查 Go 版本
GO_VERSION=$(go version | grep -oE 'go[0-9]+\.[0-9]+')
if [[ "$(printf 'go1.21\n%s' "$GO_VERSION" | sort -V | head -n1)" != "go1.21" ]]; then
    echo "❌ Go version must be 1.21 or higher. Current version: $GO_VERSION"
    exit 1
fi

echo "✅ Go version check passed: $GO_VERSION"

# 下载依赖
echo "📦 Downloading dependencies..."
go mod download

# 检查配置文件
if [ ! -f "config/config.yaml" ]; then
    echo "⚠️  Config file not found. Creating default config..."
    cp config/config.yaml.example config/config.yaml 2>/dev/null || echo "Please create config/config.yaml"
fi

# 生成 Swagger 文档
echo "📝 Generating Swagger documentation..."
SWAG_BIN="$(go env GOPATH)/bin/swag"
if [ -f "$SWAG_BIN" ]; then
    $SWAG_BIN init -g cmd/main.go -o docs --parseDependency --parseInternal
    echo "✅ Swagger docs generated"
elif command -v swag &> /dev/null; then
    swag init -g cmd/main.go -o docs --parseDependency --parseInternal
    echo "✅ Swagger docs generated"
else
    echo "⚠️  swag command not found, skipping swagger generation"
    echo "   Install with: go install github.com/swaggo/swag/cmd/swag@latest"
fi

# 编译并运行
echo "🔨 Building application..."
go build -o bin/server cmd/main.go

echo "🎯 Starting server..."
./bin/server
