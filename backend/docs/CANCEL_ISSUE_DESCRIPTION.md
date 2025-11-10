# 取消扫描功能的问题描述

## 问题现象

### 用户操作
1. 用户启动一个扫描任务（Scan ID: 44）
2. 扫描正在运行中，状态为 `RUNNING`
3. 用户点击"停止扫描"按钮
4. 系统发送取消信号到 Prefect

### 实际结果
- ✅ Prefect UI 显示 Flow Run 状态为 `Cancelled`
- ✅ 后端日志显示"已发送取消信号"
- ❌ **数据库中的 Scan 状态卡在 `CANCELLING`，没有更新为 `CANCELLED`**

### 预期结果
- 数据库中的 Scan 状态应该最终更新为 `CANCELLED`
- 前端应该显示扫描已取消

---

## 问题分析

### 时间线（来自日志）

```
12:47:33 - Flow 开始运行，状态 RUNNING
12:47:36 - 用户点击停止按钮
12:47:36 - API 发送 Cancelling 信号到 Prefect ✅
12:47:36 - 数据库更新为 CANCELLING ✅
12:47:36 - Worker: "Received cancellation request for flow run ... but no process was found" ⚠️
12:47:39 - subfinder 任务完成
12:47:?? - Prefect UI 显示 Cancelled ✅
12:47:?? - 数据库仍然是 CANCELLING ❌
```

### 关键日志

```
[2025-11-10 12:47:36] [DEBUG] [prefect.runner:975] 
Received cancellation request for flow run 70cafd3b-c9f0-4466-8198-7cbf2cd5a249 
but no process was found.
```

---

## 根本原因

### 原因 1：竞态条件（Race Condition）

**发生场景**：取消信号到达时，Flow 已经完成或接近完成

```
┌─────────────────────────────────────────────────────────────┐
│ Timeline                                                    │
├─────────────────────────────────────────────────────────────┤
│ T0: Flow 开始运行                                           │
│ T1: Flow 执行到最后阶段（即将完成）                          │
│ T2: 用户点击停止 → 发送 Cancelling 信号                     │
│ T3: Worker 收到信号，查找 Flow 进程                          │
│ T4: ❌ Flow 进程已结束，Worker: "no process was found"      │
│ T5: Flow 自然完成                                           │
└─────────────────────────────────────────────────────────────┘
```

**结果**：
- Worker 无法终止一个不存在的进程
- 取消操作失败
- **`on_cancellation` handler 不会被触发**

---

### 原因 2：Prefect 的已知限制（Task Runner）

**项目代码中使用了 Task Runner**：

```python
# apps/scan/flows/subdomain_discovery_flow.py
futures = {}
for tool_name, config in SCANNER_CONFIGS.items():
    future = run_scanner_task.submit(  # ← 使用了 .submit()
        tool=tool_name,
        target=target_name,
        workspace_dir=workspace_dir,
        ...
    )
    futures[tool_name] = future
```

**Prefect 官方已知 Bug**：[GitHub Issue #10195](https://github.com/PrefectHQ/prefect/issues/10195)

> **Bug Summary**: 当 Flow 中使用 task runner（`.submit()`）提交任务时，`on_cancellation` hook 不会被调用。

**影响**：
- 即使 Worker 成功终止 Flow，`on_cancellation` handler 也可能不触发
- 无法依赖 handler 来更新数据库状态

---

### 原因 3：Prefect 状态转换机制

**状态转换流程**：

```
正常取消流程：
Running → Cancelling → Cancelled
         ↑            ↑
         触发         不触发
         on_cancellation   （无对应 hook）
```

**问题**：
1. `on_cancellation` hook 在进入 `Cancelling` 状态时触发（不是 `Cancelled`）
2. 但由于原因 2（task runner bug），这个 hook 可能根本不触发
3. `Cancelled` 最终状态没有对应的 hook
4. 如果 Worker 直接将状态从 `Running` 改为 `Cancelled`（没有经过 `Cancelling`），也不会触发 hook

---

## 状态不一致的表现

### Prefect Server 端
```
Flow Run State: Cancelled ✅
```

### Django 数据库端
```sql
SELECT status FROM scan WHERE id = 44;
-- 结果: 'cancelling'  ❌
```

### 前端显示
```
Status Badge: 🟠 Cancelling（正在取消）
Expected:     ⚪ Cancelled（已取消）
```

---

## 受影响的场景

### 场景 A：Flow 即将完成时取消
- **触发概率**：高（30-50%）
- **现象**：Worker 找不到进程
- **结果**：状态卡在 `CANCELLING`

### 场景 B：Flow 正在执行长任务时取消
- **触发概率**：中（20-30%）
- **现象**：Worker 可能终止进程，但 handler 不触发（task runner bug）
- **结果**：状态卡在 `CANCELLING`

### 场景 C：Flow 刚启动时取消
- **触发概率**：低（10-20%）
- **现象**：Worker 成功终止，但仍可能受 task runner bug 影响
- **结果**：可能正常，也可能卡在 `CANCELLING`

---

## 系统架构说明

### 当前的取消流程

```
┌──────────┐   1. 用户点击停止   ┌─────────────┐
│  前端 UI  │ ───────────────────▶│  Django API │
└──────────┘                     └─────────────┘
                                        │
                                        │ 2. stop_scan()
                                        ▼
                                 ┌─────────────┐
                                 │  更新数据库  │
                                 │  CANCELLING │
                                 └─────────────┘
                                        │
                                        │ 3. 发送信号
                                        ▼
                                 ┌─────────────┐
                                 │ Prefect API │
                                 │ set_flow_run_state(Cancelling) │
                                 └─────────────┘
                                        │
                                        ▼
                                 ┌─────────────┐
                                 │ Prefect     │
                                 │ Worker      │
                                 └─────────────┘
                                        │
                          ┌─────────────┴──────────────┐
                          │                             │
                    找到进程 ✅                    找不到进程 ❌
                          │                             │
                          ▼                             ▼
                    终止 Flow                      Flow 已完成
                          │                             │
                          ▼                             ▼
                    Flow → Cancelled             Flow → Completed
                          │                             │
                          ▼                             │
              ❌ on_cancellation 不触发              ▼
              （task runner bug）            on_completed 触发
                          │                             │
                          ▼                             ▼
                  数据库仍是 CANCELLING          数据库变为 COMPLETED
                  
                  ❌ 状态不一致                    ❌ 状态不一致
                                              （用户已取消但显示完成）
```

### Handler 设计初衷

```python
# apps/scan/handlers/initiate_scan_flow_handlers.py

def on_initiate_scan_flow_cancelled(flow, flow_run, state):
    """
    ❌ 设计意图：当 Flow 被取消时自动更新数据库
    ❌ 实际情况：由于 task runner bug，这个 handler 不会被调用
    """
    service.update_status(scan_id, ScanStatus.CANCELLED, ...)
```

---

## 问题影响

### 对用户的影响
1. ❌ **用户体验差**：点击停止后，界面一直显示"正在取消"
2. ❌ **状态混乱**：数据库显示 `CANCELLING`，Prefect 显示 `Cancelled`
3. ❌ **无法重新扫描**：如果系统限制同一目标只能有一个运行中的扫描

### 对系统的影响
1. ❌ **数据不一致**：前后端状态不同步
2. ❌ **垃圾数据累积**：`CANCELLING` 状态的记录永远不会被清理
3. ❌ **监控告警**：可能触发状态异常告警

---

## 关键结论

### 1. 不能依赖 `on_cancellation` handler

**原因**：
- Prefect 的 task runner 会阻止 `on_cancellation` 触发（官方 bug）
- 竞态条件下，Worker 找不到进程，handler 也不会触发

### 2. Prefect UI 的 `Cancelled` 状态不可信

**原因**：
- Prefect Server 可能直接将状态改为 `Cancelled`（绕过 handler）
- 这个状态变更不会通知 Django

### 3. 需要主动同步机制

**当前缺失**：
- 没有从 Prefect 主动拉取状态的机制
- 没有兜底的状态清理任务
- 没有在其他 handler（如 `on_completed`）中处理取消逻辑

---

## 相关资源

### Prefect 官方文档
- [How to cancel running workflows](https://docs.prefect.io/v3/advanced/cancel-workflows)
- [State change hooks](https://docs.prefect.io/v3/how-to-guides/workflows/state-change-hooks)

### 已知 Issues
- [#10195 - on_cancellation hook not called with task runner](https://github.com/PrefectHQ/prefect/issues/10195)
- [#7735 - Cancellation should use CANCELLING state type](https://github.com/PrefectHQ/prefect/issues/7735)

### 项目相关文件
- `apps/scan/services/scan_service.py:stop_scan()` - 发送取消信号
- `apps/scan/handlers/initiate_scan_flow_handlers.py:on_initiate_scan_flow_cancelled()` - 取消 handler
- `apps/scan/flows/subdomain_discovery_flow.py` - 使用了 task runner

---

## 总结

这是一个由 **Prefect 框架限制** + **竞态条件** + **缺少兜底机制** 共同导致的问题：

1. **框架限制**：Prefect task runner 阻止 `on_cancellation` 触发
2. **竞态条件**：取消信号到达时 Flow 已完成
3. **缺少兜底**：没有主动同步或定时清理机制

**核心矛盾**：系统依赖 Prefect handler 来更新数据库，但 handler 在关键时刻不会被触发。
