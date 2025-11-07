<!-- 6a296180-5577-4d70-817d-4873b1132d68 309b5bce-b875-4c7a-9b15-73428b366152 -->
# 扫描历史 API 实现方案

## 目标

为前端扫描历史页面提供完整的数据接口，包括扫描汇总统计、进度计算和批量删除功能。

## 实现步骤

### 1. 修改序列化器 (`backend/apps/scan/serializers.py`)

**添加 `ScanHistorySerializer`**：

- 继承 `ModelSerializer`
- 字段映射：`targetName`, `engineName`, `startedAt`
- 添加计算字段：`summary`, `progress`

**`summary` 字段实现**：

```python
def get_summary(self, obj):
    return {
        'subdomains': obj.subdomains.count(),
        'endpoints': obj.endpoints.count(),
        'vulnerabilities': {
            'total': 0,
            'critical': 0,
            'high': 0,
            'medium': 0,
            'low': 0
        }
    }
```

**`progress` 字段实现**：

- `successful` → 100%
- `initiated` → 0%
- `failed/aborted` → 根据 `task_names` 长度计算：`(len(task_names) / 3) * 100`
- `running` → 根据 `task_names` 长度映射：
  - 0 个任务 → 10%
  - 1 个任务 → 33%
  - 2 个任务 → 66%
  - 3+ 个任务 → 90%

### 2. 修改视图集 (`backend/apps/scan/views.py`)

**优化查询性能**：

- 将 `queryset` 改为 `get_queryset()` 方法
- 使用 `select_related('target', 'engine')`
- 使用 `prefetch_related('subdomains', 'endpoints')`

**动态切换序列化器**：

- 添加 `get_serializer_class()` 方法
- `list` action 使用 `ScanHistorySerializer`
- 其他 action 使用 `ScanSerializer`

**添加批量删除接口**：

- 路径：`POST /api/scans/bulk_delete/`
- 参数：`{"ids": [1, 2, 3]}`
- 响应：`{"message": "已删除 X 个扫描记录", "deletedCount": X}`
- 错误处理：验证 ids 参数，处理数据库异常

### 3. 关键文件

**需要修改的文件**：

- `backend/apps/scan/serializers.py` - 添加 ScanHistorySerializer
- `backend/apps/scan/views.py` - 修改 ScanViewSet

**无需修改的文件**：

- `backend/apps/scan/urls.py` - DRF Router 自动处理
- `backend/apps/scan/models.py` - 模型无需改动

## API 接口说明

### 获取扫描历史列表

```
GET /api/scans/?page=1&pageSize=10&status=successful
```

**响应示例**：

```json
{
  "results": [{
    "id": 14,
    "targetName": "xinye.com",
    "engineName": "Subdomain Scan",
    "startedAt": "2025-11-07T19:28:47.558562+08:00",
    "status": "successful",
    "summary": {
      "subdomains": 5,
      "endpoints": 10,
      "vulnerabilities": {
        "total": 0,
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
      }
    },
    "progress": 100
  }],
  "total": 14,
  "page": 1,
  "pageSize": 10,
  "totalPages": 2
}
```

### 批量删除扫描记录

```
POST /api/scans/bulk_delete/
Content-Type: application/json

{"ids": [1, 2, 3]}
```

**响应**：

```json
{
  "message": "已删除 3 个扫描记录",
  "deletedCount": 3
}
```

## 技术要点

1. **性能优化**：使用 `prefetch_related` 预加载关联数据，避免 N+1 查询
2. **进度计算**：基于 `task_names` 数组长度动态计算，反映实际执行进度
3. **漏洞字段**：暂时返回 0，为后续扩展预留接口
4. **兼容性**：保持 DRF 分页格式，前端已适配 `results` 字段

## 注意事项

- 漏洞统计功能待后续实现
- 进度计算假设标准扫描有 3 个任务阶段
- 批量删除使用级联删除，会同时删除关联的子域名和端点数据

### To-dos

- [ ] 在 serializers.py 中添加 ScanHistorySerializer，实现 summary 和 progress 计算逻辑
- [ ] 修改 ScanViewSet：添加 get_queryset()、get_serializer_class() 方法
- [ ] 在 ScanViewSet 中添加 bulk_delete action，实现批量删除功能
- [ ] 测试 API 接口：验证列表数据格式、进度计算、批量删除功能