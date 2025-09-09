# Vulun Scan Backend

基于 Gin 框架的漏洞扫描系统后端服务

## 项目结构

```
backend/
├── cmd/
│   └── main.go                    # 应用程序入口
├── config/
│   ├── config.go                  # 配置管理
│   └── config.yaml               # 配置文件
├── internal/
│   ├── handlers/                 # HTTP 处理器
│   │   └── organization-handler.go  # 组织处理器
│   ├── middleware/               # 中间件
│   │   ├── cors.go              # CORS 中间件
│   │   └── logger.go            # 日志中间件
│   ├── models/                  # 数据模型
│   │   └── organization.go      # 组织模型
│   ├── services/                # 业务服务层
│   │   └── organization-service.go
│   └── utils/                   # 工具函数
│       └── response.go          # 响应工具
├── pkg/
│   └── database/                # 数据库包
│       └── database.go          # 数据库连接
├── routes/                      # 路由定义
│   └── routes.go
├── scripts/                     # 脚本文件
├── go.mod                       # Go 模块文件
├── go.sum                       # Go 依赖校验文件
└── README.md                    # 项目说明
```

## 环境要求

- Go 1.21+
- PostgreSQL 12+

## 快速开始

### 1. 安装依赖

```bash
go mod download
```

### 2. 配置数据库

确保 PostgreSQL 运行并创建数据库：

```bash
createdb vulun_scan
```

运行初始化 SQL：

```bash
psql -d vulun_scan -f 初始化.sql
```

### 3. 配置环境变量

复制并修改配置文件：

```bash
cp config/config.yaml config/config.local.yaml
```

修改 `config.local.yaml` 中的数据库连接信息。

### 4. 运行应用

```bash
go run cmd/main.go
```

服务器将在 `http://localhost:8080` 启动。

## API 文档

### 健康检查
```
GET /health
```

### 组织管理
```
GET    /api/v1/organizations        # 获取组织列表
POST   /api/v1/organizations        # 创建组织
GET    /api/v1/organizations/:id    # 获取组织详情
PUT    /api/v1/organizations/:id    # 更新组织
DELETE /api/v1/organizations/delete # 删除组织
```

### 资产管理
```
GET    /api/v1/assets/organizations        # 获取组织列表
POST   /api/v1/assets/organizations        # 创建组织
GET    /api/v1/assets/organizations/:id    # 获取组织详情
POST   /api/v1/assets/organizations/delete # 删除组织
```

## 开发说明

### 添加新的路由

1. 在 `routes/routes.go` 中添加路由定义
2. 在 `internal/handlers/` 中实现处理器逻辑
3. 在 `internal/services/` 中实现业务逻辑

### 添加新的模型

1. 在 `internal/models/` 中定义数据结构
2. 在 `internal/services/` 中实现数据访问逻辑

## 部署

### 使用 Docker

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o main cmd/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/config ./config
CMD ["./main"]
```

### 环境变量

支持的环境变量：

- `DB_HOST`: 数据库主机 (默认: localhost)
- `DB_PORT`: 数据库端口 (默认: 5432)
- `DB_USER`: 数据库用户 (默认: postgres)
- `DB_PASSWORD`: 数据库密码 (默认: postgres)
- `DB_NAME`: 数据库名 (默认: vulun_scan)
- `DB_SSLMODE`: SSL 模式 (默认: disable)
- `JWT_SECRET`: JWT 密钥
- `JWT_EXPIRY_HOUR`: JWT 过期时间（小时）

## 许可证

MIT License
