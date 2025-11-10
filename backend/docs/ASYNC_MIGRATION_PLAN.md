# 异步协程迁移方案

## 目标

将子域名扫描 Flow 从 TaskRunner (`.submit()`) 迁移到异步协程 (`asyncio.gather()`)，解决 `on_cancellation` handler 不触发的问题。

---

## 问题回顾

**当前问题：**
- 使用 `.submit()` 提交任务到 TaskRunner（多线程）
- Prefect bug: 取消时 `on_cancellation` handler 不会触发
- 导致数据库状态卡在 `CANCELLING`

**根本原因：**
- TaskRunner 创建独立线程，取消信号无法传播
- Prefect 无法控制线程生命周期

**解决方案：**
- 使用异步协程替代多线程
- `asyncio.gather()` 支持标准的取消机制
- Prefect 对 async/await 有完整支持

---

## 实施步骤

### 阶段一：创建异步版本的 Task（保留旧版本）

#### 1.1 创建异步 Task 文件

**文件路径：**
```
apps/scan/tasks/subdomain_discovery/run_scanner_task_async.py
```

**核心改动：**
```python
# 从
@task
def run_scanner_task(...):
    subprocess.run(...)

# 改为
@task
async def run_scanner_task_async(...):
    await asyncio.create_subprocess_shell(...)
```

**关键点：**
- 使用 `asyncio.create_subprocess_shell` 替代 `subprocess.run`
- 添加 `asyncio.CancelledError` 异常处理
- 进程清理逻辑（kill 进程）

#### 1.2 修改 `__init__.py` 导出

**文件路径：**
```
apps/scan/tasks/subdomain_discovery/__init__.py
```

**改动：**
```python
# 导出旧版本（兼容）
from .run_scanner_task import run_scanner_task

# 导出新版本
from .run_scanner_task_async import run_scanner_task_async

# 其他导出保持不变
from .merge_and_validate_task import merge_and_validate_task
from .save_domains_task import save_domains_task

__all__ = [
    'run_scanner_task',          # 旧版本
    'run_scanner_task_async',    # 新版本
    'merge_and_validate_task',
    'save_domains_task',
]
```

---

### 阶段二：修改 Flow 为异步

#### 2.1 修改 `subdomain_discovery_flow.py`

**文件路径：**
```
apps/scan/flows/subdomain_discovery_flow.py
```

**核心改动：**

1. Flow 函数改为 `async`
2. 导入异步 Task
3. 使用 `asyncio.gather()` 替代 `.submit()`
4. 其他 Task 保持同步（merge、save）

**详细改动见下方代码块。**

---

### 阶段三：测试验证

#### 3.1 功能测试

**测试点：**
1. ✅ 扫描任务能正常启动
2. ✅ amass 和 subfinder 并行执行
3. ✅ 扫描结果正确保存到数据库
4. ✅ 日志文件正确生成

**测试命令：**
```bash
# 1. 启动 Prefect Server
prefect server start

# 2. 启动 Worker
prefect worker start --pool default

# 3. 创建测试扫描
curl -X POST http://localhost:8888/api/scans/ \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [1],
    "engine": 1,
    "strategy": 1
  }'
```

#### 3.2 取消测试（重点）

**测试点：**
1. ✅ 点击停止按钮后，扫描立即停止
2. ✅ 数据库状态从 `CANCELLING` 更新为 `CANCELLED`
3. ✅ `on_cancellation` handler 被触发
4. ✅ 外部进程（amass/subfinder）被正确终止

**测试步骤：**
```bash
# 1. 启动一个扫描
scan_id=...

# 2. 等待 5 秒（让扫描进入执行阶段）
sleep 5

# 3. 发送取消请求
curl -X POST http://localhost:8888/api/scans/${scan_id}/stop/

# 4. 观察日志（应该看到 on_cancellation 触发）
tail -f backend/logs/app.log | grep "on_cancellation"

# 5. 检查数据库状态（应该是 CANCELLED）
# 等待 5-10 秒后查询
curl http://localhost:8888/api/scans/${scan_id}/ | jq '.status'
# 预期输出: "cancelled"

# 6. 检查进程是否终止
ps aux | grep -E "amass|subfinder"
# 应该没有残留进程
```

#### 3.3 性能测试

**对比测试：**
```bash
# 测试前（旧版本）
time: 开始到完成的总时间
memory: 内存占用峰值

# 测试后（异步版本）
time: 应该相近或略快
memory: 应该略低（协程比线程轻量）
```

---

### 阶段四：回滚方案

如果异步版本出现问题，可以快速回滚：

#### 4.1 回滚步骤

1. **恢复 `subdomain_discovery_flow.py`**
   ```bash
   git checkout HEAD -- apps/scan/flows/subdomain_discovery_flow.py
   ```

2. **重启 Prefect Worker**
   ```bash
   # 停止 Worker
   pkill -f "prefect worker"
   
   # 启动 Worker（加载旧代码）
   prefect worker start --pool default
   ```

3. **不需要数据库回滚**（状态字段未改动）

#### 4.2 回滚影响

- ✅ 正在运行的旧版本扫描不受影响
- ✅ 新扫描会使用旧版本代码
- ⚠️ 取消功能仍然有问题（回到原点）

---

## 详细代码改动

### 文件 1：`run_scanner_task_async.py`（新建）

**完整代码见附录 A**

**关键改动点：**
```python
# 1. 函数签名改为 async
@task(name='run_scanner_async', retries=2, log_prints=True)
async def run_scanner_task_async(...) -> str:

# 2. 使用异步 subprocess
proc = await asyncio.create_subprocess_shell(
    actual_command,
    stdout=asyncio.subprocess.DEVNULL,
    stderr=log_f_fd,
    ...
)

# 3. 异步等待（支持取消）
try:
    await asyncio.wait_for(proc.communicate(), timeout=timeout)
except asyncio.CancelledError:
    logger.warning("任务被取消: %s", tool)
    if proc.returncode is None:
        proc.kill()
        await proc.wait()
    raise

# 4. 超时处理
except asyncio.TimeoutError:
    proc.kill()
    await proc.wait()
    raise RuntimeError(...)
```

---

### 文件 2：`subdomain_discovery_flow.py`（修改）

**改动对比：**

```python
# ==================== 改动 1: 导入异步 Task ====================
# 旧版本
from apps.scan.tasks.subdomain_discovery import (
    run_scanner_task,  # 同步版本
    merge_and_validate_task,
    save_domains_task
)

# 新版本
from apps.scan.tasks.subdomain_discovery import (
    run_scanner_task_async,  # ← 改为异步版本
    merge_and_validate_task,
    save_domains_task
)
import asyncio  # ← 新增导入


# ==================== 改动 2: Flow 函数改为 async ====================
# 旧版本
@flow(name="subdomain_discovery", log_prints=True)
def subdomain_discovery_flow(...) -> dict:

# 新版本
@flow(name="subdomain_discovery", log_prints=True)
async def subdomain_discovery_flow(...) -> dict:  # ← 添加 async


# ==================== 改动 3: 并行执行改为 asyncio.gather ====================
# 旧版本（使用 .submit()）
futures = {}
for tool_name, config in SCANNER_CONFIGS.items():
    future = run_scanner_task.submit(  # ← TaskRunner
        tool=tool_name,
        target=target_name,
        result_dir=result_dir,
        command=config['command'],
        timeout=config['timeout']
    )
    futures[tool_name] = future

# 等待所有任务完成
results = {tool_name: future.result() for tool_name, future in futures.items()}

# 新版本（使用 asyncio.gather）
# 创建协程任务列表
tasks = [
    run_scanner_task_async(  # ← 异步 Task
        tool=tool_name,
        target=target_name,
        result_dir=result_dir,
        command=config['command'],
        timeout=config['timeout']
    )
    for tool_name, config in SCANNER_CONFIGS.items()
]

# 并行执行所有任务
results = await asyncio.gather(*tasks, return_exceptions=True)  # ← asyncio.gather

# 过滤失败的任务（异常会作为结果返回）
result_files = [
    r for r in results 
    if isinstance(r, str) and r  # 成功的任务返回字符串路径
]


# ==================== 改动 4: 其他 Task 保持同步调用 ====================
# merge_and_validate_task 和 save_domains_task 仍然是同步 Task
# 直接调用即可（Prefect 会自动处理）

# 新版本
merged_file = merge_and_validate_task(  # ← 同步 Task，直接调用
    result_files=result_files,
    result_dir=result_dir
)

saved_count = save_domains_task(  # ← 同步 Task，直接调用
    domains_file=merged_file,
    scan_id=scan_id,
    target_id=target_id
)
```

**完整新版本见附录 B**

---

### 文件 3：`__init__.py`（修改）

```python
"""
子域名发现任务模块

包含子域名发现扫描的所有原子 Tasks
"""

# 扫描工具执行
from .run_scanner_task import run_scanner_task  # 旧版本（保留兼容）
from .run_scanner_task_async import run_scanner_task_async  # 新版本

# 结果处理
from .merge_and_validate_task import merge_and_validate_task
from .save_domains_task import save_domains_task

# 废弃的 Tasks（保留向后兼容）
from .merge_results_task import merge_results_task  # DEPRECATED
from .parse_domains_task import parse_domains_task  # DEPRECATED
from .validate_domains_task import validate_domains_task  # DEPRECATED

__all__ = [
    # 推荐使用
    'run_scanner_task_async',
    'merge_and_validate_task',
    'save_domains_task',
    
    # 向后兼容
    'run_scanner_task',
    'merge_results_task',
    'parse_domains_task',
    'validate_domains_task',
]
```

---

## 风险评估

### 高风险项

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 异步 subprocess 不稳定 | 低 | 高 | 充分测试，保留回滚方案 |
| Prefect 异步支持有 bug | 低 | 高 | 先在测试环境验证 |
| 外部进程无法正确终止 | 中 | 中 | 添加进程监控和清理逻辑 |

### 中风险项

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 性能下降 | 低 | 中 | 性能测试对比 |
| 日志记录异常 | 低 | 低 | 测试日志文件完整性 |
| 兼容性问题 | 低 | 中 | 保留旧版本 Task |

### 低风险项

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 代码可读性下降 | 低 | 低 | 添加详细注释 |
| 维护成本增加 | 低 | 低 | 文档完善 |

---

## 时间规划

### 阶段一：开发（1-2 天）

- [ ] Day 1 上午：创建 `run_scanner_task_async.py`
- [ ] Day 1 下午：修改 `subdomain_discovery_flow.py`
- [ ] Day 2 上午：更新导出和注释
- [ ] Day 2 下午：代码审查

### 阶段二：测试（1 天）

- [ ] 功能测试（2 小时）
- [ ] 取消测试（3 小时）
- [ ] 性能测试（2 小时）
- [ ] 边界测试（1 小时）

### 阶段三：部署（半天）

- [ ] 测试环境部署（1 小时）
- [ ] 观察运行（2 小时）
- [ ] 生产环境部署（1 小时）

**总计：2.5-3.5 天**

---

## 验收标准

### 必须满足（P0）

- [x] 扫描任务能正常执行
- [x] 取消功能正常工作（状态更新为 CANCELLED）
- [x] `on_cancellation` handler 被触发
- [x] 外部进程被正确终止
- [x] 没有资源泄漏（进程、文件描述符）

### 应该满足（P1）

- [ ] 性能与旧版本相当（误差 ±10%）
- [ ] 日志完整且可读
- [ ] 错误处理健壮

### 可以满足（P2）

- [ ] 性能优于旧版本
- [ ] 代码更简洁

---

## 附录

### 附录 A：`run_scanner_task_async.py` 完整代码

见下一个代码块文件

### 附录 B：`subdomain_discovery_flow.py` 完整新版本

见下下个代码块文件

### 附录 C：相关文档

- Prefect 异步支持：https://docs.prefect.io/v3/develop/write-flows/#async-flows
- Python asyncio 文档：https://docs.python.org/3/library/asyncio.html
- Prefect Cancel 文档：https://docs.prefect.io/v3/develop/cancel-workflows

---

## 注意事项

### 开发注意

1. **保留旧版本代码**
   - 不要删除 `run_scanner_task.py`
   - 保持向后兼容

2. **异步函数链**
   - 如果 Flow 是 async，调用 async Task 时用 `await`
   - 调用 sync Task 时直接调用（Prefect 会处理）

3. **异常处理**
   - 必须捕获 `asyncio.CancelledError`
   - 清理资源后重新抛出

### 测试注意

1. **取消测试时机**
   - 在不同阶段测试取消（启动时、执行中、接近完成时）
   - 验证所有场景下状态都正确更新

2. **进程清理验证**
   - 取消后检查 `ps aux` 确保进程终止
   - 检查 `/proc` 目录（Linux）或 Activity Monitor（macOS）

3. **并发测试**
   - 同时启动多个扫描
   - 批量取消

### 部署注意

1. **Worker 重启**
   - 代码更新后必须重启 Worker
   - 正在运行的任务会继续使用旧代码

2. **监控**
   - 观察 Prefect UI 的 Flow Run 状态
   - 监控后端日志
   - 检查数据库状态一致性

3. **回滚准备**
   - 保留旧版本代码
   - 准备快速回滚脚本
   - 通知用户可能的短暂不可用

---

## 成功标准

✅ **核心目标达成：**
- 用户点击停止按钮后，数据库状态能从 `CANCELLING` 正确更新为 `CANCELLED`
- `on_cancellation` handler 被触发并记录日志
- 外部扫描进程被正确终止

✅ **无副作用：**
- 正常扫描功能不受影响
- 性能没有明显下降
- 没有引入新的 bug

✅ **可维护性：**
- 代码清晰易懂
- 文档完善
- 易于扩展

---

## 联系人

- 实施负责人：开发团队
- 技术审查：架构师
- 测试负责人：QA 团队
- 紧急联系：oncall

---

**文档版本：** v1.0  
**创建时间：** 2025-11-10  
**最后更新：** 2025-11-10
