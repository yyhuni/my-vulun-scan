# Prefect Flow Run ID 集成指南

## 概述

完善 Prefect 集成，支持通过 Flow Run ID 进行任务停止和进度查询。

---

## 当前状态 vs 目标状态

| 功能 | 当前状态 | 目标状态 |
|-----|---------|---------|
| 提交任务 | ✅ 使用 Prefect API | ✅ 保持 |
| 存储 Flow Run ID | ❌ 获取但未保存 | ✅ 保存到 `task_ids[0]` |
| 停止任务 | ❌ 使用 Celery API | ✅ 使用 Prefect API |
| 查询进度 | ⚠️ 基于时间估算 | ✅ 可选：Prefect API 实时查询 |

---

## 实施步骤

### 阶段 1: 存储 Flow Run ID ✅ 必须

**目的**：保存 Flow Run ID，用于后续操作

**涉及文件**：
- `apps/scan/services/scan_service.py`
- `apps/scan/models.py` (已有字段，无需修改)

**步骤**：

1. **定位提交任务的位置**
   - 文件：`scan_service.py`
   - 方法：`create_scans_for_targets()`
   - 位置：第 251 行附近

2. **在获取 flow_run_id 后立即保存**
   - 当前：只是记录日志
   - 改为：保存到 `scan.task_ids = [str(flow_run_id)]`
   - 使用：`scan.save(update_fields=['task_ids'])`

3. **更新字段说明（可选）**
   - 文件：`models.py`
   - 字段：`Scan.task_ids`
   - help_text 改为：'Prefect Flow Run ID 列表（第一个为主 Flow Run ID）'

---

### 阶段 2: 使用 Prefect API 停止任务 ✅ 必须

**目的**：替换 Celery 停止逻辑为 Prefect 取消逻辑

**涉及文件**：
- `apps/scan/services/scan_service.py`

**步骤**：

1. **删除 Celery 相关代码**
   - 方法：`stop_scan()`
   - 删除：`from celery import current_app`
   - 删除：`app.control.revoke()` 调用

2. **导入 Prefect Client**
   - 添加：`from prefect import get_client`

3. **获取 Flow Run ID**
   - 从 `scan.task_ids[0]` 读取
   - 验证：检查是否为空

4. **调用 Prefect API 取消**
   - 使用：`get_client(sync_client=True)`
   - 调用：`client.cancel_flow_run(flow_run_id)`
   - 异常处理：捕获并记录错误

5. **更新扫描状态**
   - 保持现有逻辑：更新为 `ABORTED`

6. **更新注释和文档**
   - 删除 Celery 相关注释
   - 添加 Prefect API 说明

---

### 阶段 3: Prefect API 进度查询（可选，建议暂缓）⚠️

**目的**：通过 Prefect API 获取实时进度

**建议**：暂时不实现，原因：
- 当前基于时间的估算已经足够准确
- 避免增加复杂度和 API 调用延迟
- 可以作为将来的优化项

**如果要实现，步骤如下**：

1. **创建进度查询辅助方法**
   - 位置：`serializers.py` 或 `services/`
   - 功能：通过 flow_run_id 查询 Prefect API

2. **实现混合策略**
   - 优先：尝试 Prefect API
   - 降级：时间估算（当 API 失败时）

3. **添加缓存机制**
   - 避免频繁调用 API
   - 缓存 Task Runs 状态（10-30秒）

---

## 数据流

### 提交任务流程
```
用户发起扫描
  ↓
scan_service.create_scans_for_targets()
  ↓
_submit_flow_deployment() → 返回 flow_run_id
  ↓
scan.task_ids = [flow_run_id]  ← 新增
  ↓
scan.save()  ← 新增
  ↓
返回扫描对象
```

### 停止任务流程
```
用户停止扫描
  ↓
scan_service.stop_scan(scan_id)
  ↓
获取 scan.task_ids[0] (flow_run_id)
  ↓
Prefect API: client.cancel_flow_run(flow_run_id)  ← 改为 Prefect
  ↓
更新状态为 ABORTED
  ↓
触发 Handler: on_cancellation  ← Prefect 自动触发
  ↓
返回成功
```

---

## 测试验证

### 阶段 1 验证（存储 Flow Run ID）

1. **启动服务**
   - Prefect Server
   - Django
   - Worker (serve 模式)

2. **发起扫描**
   - 通过 API 创建扫描任务

3. **检查数据库**
   ```sql
   SELECT id, task_ids FROM scan_scan ORDER BY id DESC LIMIT 1;
   ```
   - 预期：`task_ids` 不为空
   - 格式：`["550e8400-e29b-41d4-a716-446655440000"]`

4. **检查 Prefect UI**
   - 访问 http://localhost:4200
   - 找到对应的 Flow Run
   - 对比 ID 是否一致

### 阶段 2 验证（停止任务）

1. **发起长时间扫描**
   - 选择有多个目标的组织

2. **等待任务开始运行**
   - 检查状态变为 `running`

3. **调用停止 API**
   ```bash
   curl -X POST http://localhost:8888/api/scans/{id}/stop/
   ```

4. **验证结果**
   - 数据库状态：`aborted`
   - Prefect UI：Flow Run 状态为 `Cancelled`
   - 日志：显示 "已取消 Flow Run"

5. **检查 Handler 触发**
   - 查看日志：`on_initiate_scan_flow_cancelled` 是否执行

---

## 潜在问题和解决方案

### 问题 1: Flow Run ID 格式

**问题**：UUID 格式兼容性

**解决**：
- 存储为字符串：`str(flow_run_id)`
- 查询时转换回 UUID：`UUID(task_ids[0])`

### 问题 2: Prefect Server 不可用

**问题**：无法连接 Prefect API

**解决**：
- 添加异常处理
- 记录警告日志
- 返回失败状态，提示用户

### 问题 3: 旧数据兼容

**问题**：旧的扫描记录没有 flow_run_id

**解决**：
- 检查 `task_ids` 是否为空
- 为空时，提示无法停止或查询
- 或者使用降级方案（时间估算）

### 问题 4: Handler 未触发

**问题**：取消后状态未更新

**检查**：
- Handler 是否正确注册
- on_cancellation 是否实现
- 日志是否有错误

---

## 文件清单

### 必须修改
1. ✅ `apps/scan/services/scan_service.py` (2处)
   - `create_scans_for_targets()` - 存储 flow_run_id
   - `stop_scan()` - 使用 Prefect API

### 建议修改
2. ⚠️ `apps/scan/models.py`
   - 更新 `task_ids` 字段的 help_text

### 可选修改
3. ⏸️ `apps/scan/serializers.py`
   - 添加 Prefect API 进度查询（暂缓）

---

## 实施优先级

### 高优先级（立即实施）
1. **存储 Flow Run ID** - 5 分钟
2. **停止任务改用 Prefect API** - 15 分钟

### 低优先级（将来优化）
3. **Prefect API 进度查询** - 建议暂缓
4. **更新数据库字段说明** - 可选

---

## 预计工作量

- **开发时间**：20-30 分钟
- **测试时间**：15-20 分钟
- **文档更新**：10 分钟
- **总计**：45-60 分钟

---

## 下一步行动

1. ✅ **阶段 1**：存储 Flow Run ID
2. ✅ **阶段 2**：停止任务改用 Prefect API
3. ✅ 测试验证
4. ⏸️ **阶段 3**：进度查询（暂缓）

---

## 参考资料

- [Prefect Client API 文档](https://docs.prefect.io/latest/api-ref/prefect/client/)
- [Flow Run 取消文档](https://docs.prefect.io/latest/concepts/flows/#canceling-a-flow-run)
- [Flow Run API Reference](https://docs.prefect.io/latest/api-ref/prefect/client/#prefect.client.orchestration.PrefectClient.cancel_flow_run)
