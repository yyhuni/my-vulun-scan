.PHONY: build run clean test deps fmt lint

# 构建应用
build:
	@echo "🔨 Building application..."
	@go build -o bin/server cmd/main.go

# 运行应用
run:
	@echo "🚀 Starting server..."
	@go run cmd/main.go

# 清理构建文件
clean:
	@echo "🧹 Cleaning..."
	@rm -rf bin/
	@go clean

# 下载依赖
deps:
	@echo "📦 Downloading dependencies..."
	@go mod download
	@go mod tidy

# 格式化代码
fmt:
	@echo "📝 Formatting code..."
	@go fmt ./...

# 运行测试
test:
	@echo "🧪 Running tests..."
	@go test -v ./...

# 代码检查
lint:
	@echo "🔍 Running linter..."
	@golangci-lint run

# 开发模式 (带热重载)
dev:
	@echo "🔥 Starting development server..."
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Air not found. Install with: go install github.com/cosmtrek/air@latest"; \
		go run cmd/main.go; \
	fi

# 创建数据库
db-create:
	@echo "🗄️  Creating database..."
	@createdb vulun_scan || echo "Database may already exist"

# 初始化数据库
db-init:
	@echo "📊 Initializing database..."
	@psql -d vulun_scan -f 初始化.sql

# 数据库迁移
db-migrate:
	@echo "🔄 Running migrations..."
	@echo "Migration not implemented yet"

# 帮助信息
help:
	@echo "Available commands:"
	@echo "  build       - Build the application"
	@echo "  run         - Run the application"
	@echo "  clean       - Clean build files"
	@echo "  deps        - Download dependencies"
	@echo "  fmt         - Format code"
	@echo "  test        - Run tests"
	@echo "  lint        - Run linter"
	@echo "  dev         - Start development server with hot reload"
	@echo "  db-create   - Create database"
	@echo "  db-init     - Initialize database with schema"
	@echo "  help        - Show this help"
