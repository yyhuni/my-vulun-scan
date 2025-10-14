# 工具执行系统 API 接口规范

## 1. 接口概览

### 1.1 基础信息
- **Base URL**: `http://localhost:8888/api/v1`
- **认证方式**: 暂无（根据项目规范，当前不考虑安全验证）
- **响应格式**: JSON
- **字符编码**: UTF-8

### 1.2 通用响应格式
```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

### 1.3 错误码定义
| 错误码 | 说明 | HTTP状态码 |
|--------|------|------------|
| 200 | 成功 | 200 |
| 400 | 请求参数错误 | 400 |
| 404 | 资源不存在 | 404 |
| 500 | 服务器内部错误 | 500 |

## 2. 工具管理接口

### 2.1 获取工具列表
```http
GET /api/v1/tools
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | int | 否 | 页码 | 1 |
| page_size | int | 否 | 每页数量 | 20 |
| category | string | 否 | 工具分类 | - |
| is_active | bool | 否 | 是否启用 | - |

**响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "tools": [
      {
        "id": 1,
        "name": "nuclei",
        "display_name": "Nuclei 漏洞扫描器",
        "description": "基于模板的漏洞扫描工具",
        "command_template": "nuclei -u {{.target}} -t {{.templates}}",
        "timeout_seconds": 300,
        "category": "vulnerability_scanner",
        "version": "v2.9.15",
        "is_active": true,
        "created_at": "2025-10-14T10:00:00+08:00",
        "updated_at": "2025-10-14T10:00:00+08:00"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

### 2.2 获取工具详情
```http
GET /api/v1/tools/{id}
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 工具ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "name": "nuclei",
    "display_name": "Nuclei 漏洞扫描器",
    "description": "基于模板的漏洞扫描工具",
    "command_template": "nuclei -u {{.target}} -t {{.templates}} -o {{.output}}",
    "workdir": "/tmp/nuclei",
    "timeout_seconds": 300,
    "env": "{\"NUCLEI_CONFIG\":\"/etc/nuclei/config.yaml\"}",
    "category": "vulnerability_scanner",
    "version": "v2.9.15",
    "is_active": true,
    "created_at": "2025-10-14T10:00:00+08:00",
    "updated_at": "2025-10-14T10:00:00+08:00"
  }
}
```

### 2.3 创建工具
```http
POST /api/v1/tools
```

**请求体**:
```json
{
  "name": "nmap",
  "display_name": "Nmap 端口扫描器",
  "description": "网络发现和安全审计工具",
  "command_template": "nmap {{.target}} {{.options}}",
  "workdir": "/tmp/nmap",
  "timeout_seconds": 600,
  "env": "{}",
  "category": "port_scanner",
  "version": "7.94"
}
```

**响应示例**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": 2,
    "name": "nmap",
    "display_name": "Nmap 端口扫描器",
    "is_active": true,
    "created_at": "2025-10-14T15:30:00+08:00"
  }
}
```

## 3. 执行管理接口

### 3.1 启动工具执行
```http
POST /api/v1/tools/{id}/executions
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 工具ID |

**请求体**:
```json
{
  "args": {
    "target": "https://example.com",
    "templates": "/nuclei-templates/cves/",
    "output": "/tmp/scan-results.json"
  },
  "timeout_seconds": 600,
  "idempotency_key": "2b5a0f4a-1f1e-4d6f-b0a2-9a6d1c0f9abc"
}
```

**请求参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| args | object | 是 | 工具执行参数，用于模板替换 |
| timeout_seconds | int | 否 | 执行超时时间（秒），覆盖工具默认值 |
| idempotency_key | string | 否 | 幂等键，短时间内相同键仅创建一次执行任务（用于防重复提交） |

**响应示例**:
```json
{
  "code": 200,
  "message": "执行任务已启动",
  "data": {
    "execution_id": 123,
    "status": "queued",
    "created_at": "2025-10-14T15:30:00+08:00"
  }
}
```

### 3.2 获取执行详情
```http
GET /api/v1/executions/{id}
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 执行ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 123,
    "tool_id": 1,
    "status": "completed",
    "exit_code": 0,
    "pid": 12345,
    "args": "{\"target\":\"https://example.com\",\"templates\":\"/nuclei-templates/cves/\"}",
    "log_file_path": "/var/log/executions/123.log",
    "error_message": null,
    "started_at": "2025-10-14T15:30:05+08:00",
    "finished_at": "2025-10-14T15:35:20+08:00",
    "created_at": "2025-10-14T15:30:00+08:00",
    "updated_at": "2025-10-14T15:35:20+08:00",
    "tool": {
      "id": 1,
      "name": "nuclei",
      "display_name": "Nuclei 漏洞扫描器"
    }
  }
}
```

### 3.3 获取执行列表
```http
GET /api/v1/executions
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | int | 否 | 页码 | 1 |
| page_size | int | 否 | 每页数量 | 20 |
| tool_id | int | 否 | 工具ID筛选 | - |
| status | string | 否 | 状态筛选（单个状态） | - |
| statuses | array[string] | 否 | 多状态筛选（如 ["running","failed"]) | - |
| from_ts | string | 否 | 起始时间(ISO8601) | - |
| to_ts | string | 否 | 结束时间(ISO8601) | - |
| sort_by | string | 否 | 排序字段 | created_at |
| sort_order | string | 否 | 排序方向(asc/desc) | desc |

**响应示例**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "executions": [
      {
        "id": 123,
        "tool_id": 1,
        "status": "completed",
        "exit_code": 0,
        "started_at": "2025-10-14T15:30:05+08:00",
        "finished_at": "2025-10-14T15:35:20+08:00",
        "created_at": "2025-10-14T15:30:00+08:00",
        "tool": {
          "name": "nuclei",
          "display_name": "Nuclei 漏洞扫描器"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20,
    "total_pages": 3
  }
}
```

### 3.4 取消执行
```http
POST /api/v1/executions/{id}/cancel
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 执行ID |

**响应示例**:
```json
{
  "code": 200,
  "message": "执行已取消",
  "data": {
    "id": 123,
    "status": "canceled",
    "finished_at": "2025-10-14T15:32:10+08:00"
  }
}
```

### 3.5 获取执行日志
```http
GET /api/v1/executions/{id}/logs
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 执行ID |

**查询参数**:
| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| stream | string | 否 | 日志流类型(stdout/stderr/all) | all |
| limit | int | 否 | 返回行数限制 | 1000 |
| offset | int | 否 | 偏移量 | 0 |
| from_ts | string | 否 | 起始时间(ISO8601) | - |
| to_ts | string | 否 | 结束时间(ISO8601) | - |
| order | string | 否 | 排序方向(asc/desc) | asc |

**响应示例（包含 next_offset 用于翻页）**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "logs": [
      {
        "timestamp": "2025-10-14T15:30:06+08:00",
        "stream": "stdout",
        "line": "[INF] Using Nuclei Engine 2.9.15"
      },
      {
        "timestamp": "2025-10-14T15:30:07+08:00",
        "stream": "stdout",
        "line": "[INF] Loading templates..."
      }
    ],
    "total_lines": 245,
    "has_more": true,
    "next_offset": 100
  }
}
```

## 4. 实时事件流接口

### 4.1 SSE 事件流
```http
GET /api/v1/executions/{id}/stream
```

**路径参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | int | 是 | 执行ID |

**响应头**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### 4.1.1 重连与 Last-Event-ID

- 服务器端在每条事件中包含 `id: <incremental-id>`（自增或时间序列）。
- 浏览器 EventSource 在重连时会自动携带 `Last-Event-ID` 请求头，服务端应据此从断点续传。
- 可选设置 `retry: 5000` 指示客户端 5s 后重连。

事件示例中的每条记录均包含 `id:` 字段以便断点续传。

**事件类型**:
| 事件类型 | 说明 | 触发时机 |
|----------|------|----------|
| connected | 连接确认 | 客户端连接时 |
| started | 执行开始 | 命令开始执行 |
| log | 日志输出 | 实时命令输出 |
| progress | 进度更新 | 可选，工具支持时 |
| completed | 执行完成 | 命令成功结束 |
| failed | 执行失败 | 命令异常结束 |
| canceled | 执行取消 | 用户取消执行 |
| timeout | 执行超时 | 命令执行超时 |

**事件格式示例（具名事件 + 事件ID）**:

连接确认:
```
id: 1
event: connected
data: {"execution_id": 123}
```

执行开始:
```
id: 2
event: started
data: {"execution_id": 123, "pid": 12345, "started_at": "2025-10-14T15:30:05+08:00", "command": "nuclei -u https://example.com"}
```

日志输出:
```
id: 3
event: log
data: {"execution_id": 123, "stream": "stdout", "timestamp": "2025-10-14T15:30:10+08:00", "line": "[INF] Loading templates..."}
```

执行完成:
```
id: 120
event: completed
data: {"execution_id": 123, "exit_code": 0, "finished_at": "2025-10-14T15:35:20+08:00", "duration_ms": 315000}
retry: 5000
```

执行失败:
```
id: 98
event: failed
data: {"execution_id": 123, "exit_code": 1, "finished_at": "2025-10-14T15:32:30+08:00", "error_message": "Target unreachable"}
```

保活消息:
```
: keepalive
```

## 5. 状态码定义

### 5.1 执行状态
| 状态 | 说明 | 描述 |
|------|------|------|
| queued | 已入队 | 任务已提交，等待执行 |
| running | 执行中 | 命令正在执行 |
| completed | 已完成 | 命令成功执行完成 |
| failed | 执行失败 | 命令执行失败 |
| canceled | 已取消 | 用户主动取消执行 |
| timeout | 执行超时 | 命令执行超时被终止 |

## 6. 错误处理

### 6.1 常见错误响应

参数验证错误:
```json
{
  "code": 400,
  "message": "请求参数错误: target参数不能为空",
  "data": null
}
```

资源不存在:
```json
{
  "code": 404,
  "message": "工具不存在",
  "data": null
}
```

服务器错误:
```json
{
  "code": 500,
  "message": "启动执行失败: 队列服务不可用",
  "data": null
}
```

## 7. 使用示例

### 7.1 完整执行流程
```bash
#!/bin/bash

# 1. 获取工具列表
curl -X GET "http://localhost:8888/api/v1/tools"

# 2. 启动执行
EXECUTION_ID=$(curl -sS -X POST "http://localhost:8888/api/v1/tools/1/executions" \
  -H "Content-Type: application/json" \
  -d '{
    "args": {
      "target": "https://example.com",
      "templates": "/nuclei-templates/cves/"
    },
    "timeout_seconds": 600
  }' | jq -r '.data.execution_id')

echo "Started execution: $EXECUTION_ID"

# 3. 监听实时事件
curl -N -H "Accept: text/event-stream" \
  "http://localhost:8888/api/v1/executions/$EXECUTION_ID/stream" &

# 4. 查询执行状态
sleep 5
curl -sS "http://localhost:8888/api/v1/executions/$EXECUTION_ID" | jq

# 5. 获取执行日志（可选）
curl -sS "http://localhost:8888/api/v1/executions/$EXECUTION_ID/logs?limit=100" | jq

# 6. 取消执行（如果需要）
# curl -sS -X POST "http://localhost:8888/api/v1/executions/$EXECUTION_ID/cancel"
```

### 7.2 前端 JavaScript 示例
```javascript
// 启动执行
const startExecution = async (toolId, args) => {
  const response = await fetch(`/api/v1/tools/${toolId}/executions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ args }),
  });
  
  const result = await response.json();
  return result.data.execution_id;
};

// 监听实时事件
const subscribeToExecution = (executionId) => {
  const eventSource = new EventSource(`/api/v1/executions/${executionId}/stream`);
  
  eventSource.addEventListener('started', (event) => {
    const data = JSON.parse(event.data);
    console.log('执行开始:', data);
  });
  
  eventSource.addEventListener('log', (event) => {
    const data = JSON.parse(event.data);
    console.log(`[${data.stream}] ${data.line}`);
  });
  
  eventSource.addEventListener('completed', (event) => {
    const data = JSON.parse(event.data);
    console.log('执行完成:', data);
    eventSource.close();
  });
  
  eventSource.addEventListener('failed', (event) => {
    const data = JSON.parse(event.data);
    console.error('执行失败:', data);
    eventSource.close();
  });
  
  return eventSource;
};

// 使用示例
const executionId = await startExecution(1, {
  target: 'https://example.com',
  templates: '/nuclei-templates/cves/'
});

const eventSource = subscribeToExecution(executionId);
```

## 8. 性能考虑

### 8.1 分页建议
- 默认页大小：20
- 最大页大小：100
- 大数据量查询使用游标分页

### 8.2 SSE 连接管理
- 客户端应处理连接断开重连
- 服务端定期发送保活消息
- 建议设置连接超时时间

### 8.3 日志查询优化
- 大日志文件分批获取
- 支持按时间范围筛选
- 考虑日志压缩存储

---

**文档版本**: v1.0  
**最后更新**: 2025-10-14  
**维护团队**: 后端开发组
