# Prefect Flow 手动中止实现指南

## 概述

实现用户手动取消正在运行的 Prefect Flow 扫描任务。

---

## 架构设计

### 1. 数据流
```
用户发起取消请求
    ↓
API Endpoint (/api/scans/{scan_id}/cancel/)
    ↓
ScanService.cancel_scan(scan_id)
    ↓
Prefect Client API (cancel_flow_run)
    ↓
Prefect 触发 on_cancellation Hook
    ↓
Handler 更新 Scan 状态为 ABORTED
```

### 2. Flow Run ID 存储
**重用现有字段**：`Scan.task_ids[0]` 存储 Flow Run ID

**原因**：
- Prefect Flow 是顶层编排，只有一个 Flow Run ID
- `task_ids` 字段原本用于存储 Celery 任务 ID 列表
- 迁移到 Prefect 后，第一个元素存储 Flow Run ID

---

## 实现步骤

### Step 1: 修改 Scan 模型字段注释

**文件**: `apps/scan/models.py`

```python
task_ids = ArrayField(
    models.CharField(max_length=100),
    blank=True,
    default=list,
    help_text='Flow Run ID 列表（第一个元素为主 Flow Run ID）'  # 修改注释
)
```

**无需数据迁移**：字段类型不变，只是用途改变。

---

### Step 2: 改为异步提交 Flow

**文件**: `apps/scan/services/scan_service.py`

**当前代码（L236）**：
```python
# ⚠️ 同步调用（阻塞）
flow_result = initiate_scan_flow(**flow_kwargs)
```

**修改为异步提交**：
```python
from prefect import flow
from prefect.client.orchestration import get_client

# 方案 1: 使用 Deployment（推荐，需要先部署 Flow）
from prefect.deployments import run_deployment

async def _submit_flow_async(self, scan: Scan, flow_kwargs: dict) -> str:
    """异步提交 Flow 并返回 Flow Run ID"""
    flow_run = await run_deployment(
        name="initiate_scan/production",  # Deployment 名称
        parameters=flow_kwargs,
        timeout=0  # 不等待结果
    )
    return str(flow_run.id)

# 方案 2: 直接调用 Flow（开发环境临时方案）
def _submit_flow_sync(self, scan: Scan, flow_kwargs: dict) -> str:
    """同步提交 Flow 并返回 Flow Run ID"""
    from prefect.states import Scheduled
    from prefect.flow_runs import create_flow_run
    
    # 创建 Flow Run（不立即执行）
    flow_run = initiate_scan_flow.apply_async(
        parameters=flow_kwargs
    )
    return str(flow_run.id)
```

**在 create_scans_for_targets 中调用**：
```python
# L236 修改为
import asyncio

try:
    # 异步提交 Flow
    flow_run_id = asyncio.run(self._submit_flow_async(scan, flow_kwargs))
    
    # 保存 Flow Run ID
    self.scan_repo.append_task(
        scan_id=scan.id,
        task_id=flow_run_id,
        task_name='initiate_scan_flow'
    )
    
    successful_scans.append(scan)
    logger.info(
        "扫描任务已提交 - Scan ID: %s, Flow Run ID: %s",
        scan.id,
        flow_run_id
    )
except Exception as e:
    # 错误处理...
```

---

### Step 3: 实现取消 Flow 方法

**文件**: `apps/scan/services/scan_service.py`

```python
async def cancel_scan(self, scan_id: int) -> tuple[bool, str]:
    """
    取消正在运行的扫描任务
    
    职责：
    - 验证扫描状态（只能取消 RUNNING/INITIATED）
    - 通过 Prefect Client API 取消 Flow Run
    - 触发 on_cancellation Hook（自动更新状态为 ABORTED）
    
    Args:
        scan_id: 扫描任务 ID
    
    Returns:
        (是否成功, 消息)
    
    触发流程：
        1. 调用 Prefect API 取消 Flow
        2. Prefect 触发 on_cancellation Hook
        3. Handler 更新 Scan.status = ABORTED
    """
    try:
        # 1. 获取扫描对象
        scan = self.scan_repo.get_by_id(scan_id)
        if not scan:
            return False, f"扫描任务不存在 - Scan ID: {scan_id}"
        
        # 2. 验证状态（只能取消 RUNNING/INITIATED）
        if scan.status not in [ScanTaskStatus.RUNNING, ScanTaskStatus.INITIATED]:
            return False, f"无法取消扫描：当前状态为 {ScanTaskStatus(scan.status).label}"
        
        # 3. 获取 Flow Run ID
        flow_run_id = scan.task_ids[0] if scan.task_ids else None
        if not flow_run_id:
            return False, "Flow Run ID 不存在，无法取消"
        
        # 4. 调用 Prefect API 取消 Flow
        from prefect.client.orchestration import get_client
        from uuid import UUID
        
        async with get_client() as client:
            # 取消 Flow Run
            await client.set_flow_run_state(
                flow_run_id=UUID(flow_run_id),
                state=Cancelled(message="用户手动取消扫描"),
                force=True
            )
        
        logger.info(
            "已发送取消请求 - Scan ID: %s, Flow Run ID: %s",
            scan_id,
            flow_run_id
        )
        
        # 注意：状态更新由 on_cancellation Hook 自动处理
        # 不需要手动更新 scan.status
        
        return True, "取消请求已发送"
        
    except Exception as e:
        logger.exception("取消扫描失败 - Scan ID: %s", scan_id)
        return False, f"取消失败: {str(e)}"


# 同步包装器（用于 Django View）
def cancel_scan_sync(self, scan_id: int) -> tuple[bool, str]:
    """cancel_scan 的同步版本（供 Django View 调用）"""
    import asyncio
    return asyncio.run(self.cancel_scan(scan_id))
```

---

### Step 4: 创建 API Endpoint

**文件**: `apps/scan/views.py`

```python
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

class ScanViewSet(viewsets.ModelViewSet):
    # ... 现有代码 ...
    
    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_scan(self, request, pk=None):
        """
        取消正在运行的扫描任务
        
        POST /api/scans/{scan_id}/cancel/
        
        Returns:
            200: 取消成功
            400: 状态不允许取消
            404: 扫描不存在
        """
        scan_id = int(pk)
        scan_service = ScanService()
        
        success, message = scan_service.cancel_scan_sync(scan_id)
        
        if success:
            return Response(
                {'message': message},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )
```

---

### Step 5: 前端调用示例

```typescript
// services/scan.service.ts
export const cancelScan = async (scanId: number): Promise<void> => {
  await api.post(`/api/scans/${scanId}/cancel/`)
}

// hooks/use-scans.ts
export const useScans = () => {
  const queryClient = useQueryClient()
  
  const cancelScanMutation = useMutation({
    mutationFn: cancelScan,
    onSuccess: () => {
      toast.success('扫描任务已取消')
      queryClient.invalidateQueries(['scans'])
    },
    onError: (error) => {
      toast.error(`取消失败: ${error.message}`)
    }
  })
  
  return { cancelScanMutation }
}
```

---

## 执行流程

### 用户取消扫描

```
1. 用户点击"取消"按钮
   ↓
2. 前端调用 POST /api/scans/{scan_id}/cancel/
   ↓
3. ScanService.cancel_scan_sync()
   ↓
4. Prefect Client API: client.set_flow_run_state(Cancelled)
   ↓
5. Prefect 触发 on_cancellation Hook
   ↓
6. Handler: on_initiate_scan_flow_cancelled()
   ↓
7. 更新数据库: Scan.status = ABORTED
   ↓
8. 前端刷新列表，显示"已中止"
```

---

## 注意事项

### 1. 异步调用问题
- Django View 是同步的，需要使用 `asyncio.run()` 包装异步方法
- 或者使用 `asgiref.sync.async_to_sync` 装饰器

### 2. Flow Run ID 格式
- Prefect Flow Run ID 是 UUID 格式
- 需要使用 `UUID(flow_run_id)` 转换

### 3. 状态同步
- **不要**在 `cancel_scan` 中手动更新 `scan.status`
- 让 `on_cancellation` Hook 自动处理
- 避免状态不一致

### 4. Deployment 配置
- 生产环境建议使用 Deployment 方式
- 需要先部署 Flow：
  ```bash
  prefect deployment build apps/scan/flows/initiate_scan_flow.py:initiate_scan_flow \
    -n production \
    -q default \
    --apply
  ```

---

## 测试步骤

1. **启动扫描**：
   ```bash
   curl -X POST http://localhost:8888/api/scans/ \
     -H "Content-Type: application/json" \
     -d '{"target_ids": [1], "engine_id": 1}'
   ```

2. **查看 Flow Run ID**：
   ```bash
   curl http://localhost:8888/api/scans/1/
   # 检查 task_ids[0] 是否有 Flow Run ID
   ```

3. **取消扫描**：
   ```bash
   curl -X POST http://localhost:8888/api/scans/1/cancel/
   ```

4. **验证状态**：
   ```bash
   curl http://localhost:8888/api/scans/1/
   # status 应该变为 "aborted"
   ```

---

## 常见问题

### Q1: 为什么不直接在 `cancel_scan` 中更新状态？
**A**: 为了保持架构一致性：
- 所有状态更新都由 Prefect Hooks 统一管理
- 避免 Service 层和 Handler 层的状态冲突
- 遵循"快速失败"架构设计原则

### Q2: 如果 Flow 已经完成，取消会怎样？
**A**: Prefect 会返回错误，`cancel_scan` 应该返回 `(False, "Flow 已完成")`

### Q3: 取消后任务会立即停止吗？
**A**: 
- Flow 层：立即停止
- Task 层：正在执行的 Task 会完成当前步骤后停止
- 如需强制终止，需要在 Task 中实现取消检查逻辑

---

## 文件清单

需要修改的文件：
- ✅ `apps/scan/models.py` - 更新字段注释
- ✅ `apps/scan/services/scan_service.py` - 添加 `cancel_scan` 方法
- ✅ `apps/scan/services/scan_service.py` - 修改 Flow 提交逻辑
- ✅ `apps/scan/views.py` - 添加 `cancel` API endpoint
- ✅ `apps/scan/handlers/initiate_scan_flow_handlers.py` - 已有 `on_cancellation` Handler

前端文件（如需实现）：
- `frontend/services/scan.service.ts`
- `frontend/hooks/use-scans.ts`
- `frontend/components/scan/history/scan-history-actions.tsx`
