# Vulun Scan Backend API 文档

## 概述

这是漏洞扫描系统的后端API文档，包含组织管理、域名管理、扫描管理和漏洞管理等功能。

## 基础信息

- 基础URL: `http://localhost:8080/api/v1`
- 响应格式: JSON
- 字符编码: UTF-8

## 通用响应格式

```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {...}
}
```

## 组织管理 API

### 1. 获取所有组织
- **GET** `/organizations`
- **响应**: 组织列表

### 2. 创建组织
- **POST** `/organizations/create`
- **请求体**:
```json
{
  "name": "组织名称",
  "description": "组织描述"
}
```

### 3. 获取组织详情
- **GET** `/organizations/{id}`
- **参数**: id - 组织ID

### 4. 更新组织
- **POST** `/organizations/{id}/update`
- **请求体**:
```json
{
  "name": "新组织名称",
  "description": "新组织描述"
}
```

### 5. 删除组织
- **POST** `/organizations/delete`
- **请求体**:
```json
{
  "organization_id": "组织ID"
}
```

### 6. 批量删除组织
- **POST** `/organizations/batch-delete`
- **请求体**:
```json
{
  "organization_ids": ["id1", "id2", "id3"]
}
```

### 7. 搜索组织
- **GET** `/organizations/search?q=搜索关键词`

## 主域名管理 API

### 1. 获取组织主域名
- **GET** `/organizations/{id}/main-domains`
- **参数**: id - 组织ID
- **响应**:
```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {
    "main_domains": [
      {
        "id": "域名ID",
        "main_domain_name": "example.com",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2. 创建主域名
- **POST** `/assets/main-domains/create`
- **请求体**:
```json
{
  "main_domains": ["example.com", "test.com"],
  "organization_id": "组织ID"
}
```

### 3. 移除组织主域名关联
- **POST** `/organizations/remove-main-domain`
- **请求体**:
```json
{
  "organization_id": "组织ID",
  "main_domain_id": "主域名ID"
}
```

## 子域名管理 API

### 1. 获取组织子域名
- **GET** `/organizations/{id}/sub-domains?page=1&pageSize=10`
- **参数**: 
  - id - 组织ID
  - page - 页码（可选，默认1）
  - pageSize - 每页数量（可选，默认10）
- **响应**:
```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {
    "sub_domains": [
      {
        "id": "子域名ID",
        "sub_domain_name": "www.example.com",
        "main_domain_id": "主域名ID",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "main_domain": {
          "id": "主域名ID",
          "main_domain_name": "example.com",
          "created_at": "2024-01-01T00:00:00Z"
        }
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 10
  }
}
```

### 2. 创建子域名
- **POST** `/assets/sub-domains/create`
- **请求体**:
```json
{
  "sub_domains": ["www", "api", "admin"],
  "main_domain_id": "主域名ID",
  "status": "unknown"
}
```

## 扫描管理 API

### 1. 开始组织扫描
- **POST** `/scan/organizations/{id}/start`
- **参数**: id - 组织ID
- **响应**:
```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": {
    "task_id": "扫描任务ID",
    "message": "成功创建 3 个扫描任务"
  }
}
```

### 2. 获取组织扫描历史
- **GET** `/scan/organizations/{id}/history`
- **参数**: id - 组织ID
- **响应**:
```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": [
    {
      "id": "扫描任务ID",
      "organization_id": "组织ID",
      "main_domain_id": "主域名ID",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 漏洞管理 API

### 1. 获取组织漏洞
- **GET** `/organizations/{id}/vulnerabilities`
- **参数**: id - 组织ID
- **响应**:
```json
{
  "code": "SUCCESS",
  "message": "操作成功",
  "data": [
    {
      "id": "VUL-001",
      "title": "SQL 注入漏洞",
      "severity": "高危",
      "cvss": 9.8,
      "cve": "CVE-2024-1234",
      "domain": "api.example.com",
      "port": 443,
      "service": "Web Application",
      "description": "漏洞描述",
      "discovered_date": "2024-01-01T00:00:00Z",
      "status": "待修复",
      "organization": "组织名称",
      "affected_url": "https://api.example.com/login",
      "risk_score": 95,
      "poc": "漏洞验证代码",
      "solution": "修复方案",
      "organization_id": "组织ID"
    }
  ]
}
```

## 状态代码

- `200` - 请求成功
- `400` - 请求参数错误
- `404` - 资源未找到
- `422` - 验证错误
- `500` - 服务器内部错误

## 错误响应格式

```json
{
  "code": "ERROR",
  "message": "错误描述"
}
```

## 注意事项

1. 所有日期时间均为UTC时间，格式为ISO 8601
2. 漏洞数据目前使用模拟数据，实际项目中应连接真实的漏洞数据库
3. 扫描功能目前只创建任务记录，实际扫描逻辑需要后续实现
4. 建议在生产环境中添加认证和授权机制
