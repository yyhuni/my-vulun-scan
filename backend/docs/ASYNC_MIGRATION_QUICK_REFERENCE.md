# 异步迁移快速参考

## 核心改动概览

### 三个关键点

1. **创建异步 Task**
   ```python
   # 文件: run_scanner_task_async.py
   @task
   async def run_scanner_task_async(...):  # ← 添加 async
       proc = await asyncio.create_subprocess_shell(...)  # ← 使用异步 subprocess
       await asyncio.wait_for(proc.communicate(), timeout=timeout)  # ← 异步等待
   ```

2. **Flow 改为异步**
   ```python
   # 文件: subdomain_discovery_flow.py
   @flow
   async def subdomain_discovery_flow(...):  # ← 添加 async
       pass
   ```

3. **使用 asyncio.gather 替代 .submit()**
   ```python
   # 旧代码（删除）
   futures = {}
   for tool in tools:
       future = run_scanner_task.submit(...)  # ← 删除
       futures[tool] = future
   results = {tool: future.result() for tool, future in futures.items()}  # ← 删除
   
   # 新代码（添加）
   tasks = [
       run_scanner_task_async(tool, ...)  # ← 创建协程
       for tool in tools
   ]
   results = await asyncio.gather(*tasks, return_exceptions=True)  # ← 并行执行
   ```

---

## 完整改动对比

### 文件 1: `run_scanner_task_async.py`（新建）

```python
# 关键改动点

# 1. 函数签名
async def run_scanner_task_async(...):  # ← async

# 2. 异步 subprocess
proc = await asyncio.create_subprocess_shell(
    actual_command,
    stdout=asyncio.subprocess.DEVNULL,  # ← asyncio.subprocess
    stderr=log_f,
)

# 3. 异步等待
await asyncio.wait_for(proc.communicate(), timeout=timeout)  # ← await

# 4. 取消处理（新增）
except asyncio.CancelledError:
    logger.warning("任务被取消: %s", tool)
    if proc and proc.returncode is None:
        proc.kill()  # 终止进程
        await proc.wait()  # 等待终止
    raise  # 重新抛出

# 5. 超时处理
except asyncio.TimeoutError:  # ← asyncio.TimeoutError
    proc.kill()
    await proc.wait()
    raise RuntimeError(...)
```

---

### 文件 2: `subdomain_discovery_flow.py`（修改）

#### 改动点 1: 导入

```python
# 新增导入
import asyncio

# 修改导入
from apps.scan.tasks.subdomain_discovery import (
    run_scanner_task_async,  # ← 改为异步版本（旧：run_scanner_task）
    merge_and_validate_task,
    save_domains_task
)
```

#### 改动点 2: Flow 签名

```python
# 旧版本
@flow(name="subdomain_discovery", log_prints=True)
def subdomain_discovery_flow(...) -> dict:

# 新版本
@flow(name="subdomain_discovery", log_prints=True)
async def subdomain_discovery_flow(...) -> dict:  # ← 添加 async
```

#### 改动点 3: 并行执行（核心）

```python
# ========== 旧版本（删除这段代码） ==========
futures = {}
for tool_name, config in SCANNER_CONFIGS.items():
    future = run_scanner_task.submit(
        tool=tool_name,
        target=target_name,
        result_dir=result_dir,
        command=config['command'],
        timeout=config['timeout']
    )
    futures[tool_name] = future

results = {tool_name: future.result() for tool_name, future in futures.items()}

# 过滤失败的任务
result_files = [result for result in results.values() if result]


# ========== 新版本（替换为这段代码） ==========
# 创建协程任务列表
tasks = [
    run_scanner_task_async(
        tool=tool_name,
        target=target_name,
        result_dir=result_dir,
        command=config['command'],
        timeout=config['timeout']
    )
    for tool_name, config in SCANNER_CONFIGS.items()
]

# 并行执行所有任务
results = await asyncio.gather(*tasks, return_exceptions=True)

# 处理结果
result_files = []
for i, result in enumerate(results):
    tool_name = list(SCANNER_CONFIGS.keys())[i]
    
    if isinstance(result, Exception):
        logger.error("扫描工具 %s 执行失败: %s", tool_name, result)
    elif isinstance(result, str) and result:
        result_files.append(result)
```

#### 改动点 4: 取消处理（新增）

```python
# 在 Flow 末尾添加
except asyncio.CancelledError:
    logger.warning("子域名发现扫描被取消 - Scan ID: %s", scan_id)
    raise  # 重新抛出，让 Prefect 处理
```

---

### 文件 3: `__init__.py`（修改）

```python
# 添加导出
from .run_scanner_task_async import run_scanner_task_async

__all__ = [
    'run_scanner_task_async',  # ← 新增
    'run_scanner_task',        # 保留（向后兼容）
    'merge_and_validate_task',
    'save_domains_task',
]
```

---

## 实施检查清单

### 阶段一：代码修改

- [ ] 创建 `run_scanner_task_async.py`
- [ ] 修改 `subdomain_discovery_flow.py`
  - [ ] 添加 `import asyncio`
  - [ ] 导入 `run_scanner_task_async`
  - [ ] Flow 函数添加 `async`
  - [ ] 替换 `.submit()` 为 `asyncio.gather()`
  - [ ] 添加 `asyncio.CancelledError` 处理
- [ ] 更新 `__init__.py` 导出
- [ ] 代码审查

### 阶段二：部署

- [ ] 提交代码到 Git
- [ ] 部署到测试环境
- [ ] **重启 Prefect Worker**（重要！）
  ```bash
  pkill -f "prefect worker"
  prefect worker start --pool default
  ```
- [ ] 检查 Worker 日志（确认加载新代码）

### 阶段三：测试

- [ ] 功能测试：扫描能正常执行
- [ ] 取消测试：运行 `test_cancel.sh`
  ```bash
  chmod +x docs/code_examples/test_cancel.sh
  ./docs/code_examples/test_cancel.sh
  ```
- [ ] 检查日志：确认 `on_cancellation` 被触发
  ```bash
  tail -f backend/logs/app.log | grep -i "on_cancellation\|CANCELLED"
  ```
- [ ] 检查进程：确认无残留
  ```bash
  ps aux | grep -E "amass|subfinder"
  ```
- [ ] 检查数据库：状态为 `CANCELLED`
  ```bash
  curl http://localhost:8888/api/scans/{scan_id}/ | jq '.status'
  ```

---

## 常见问题

### Q1: 改完代码后取消功能还是不工作？

**A:** 检查 Prefect Worker 是否重启

```bash
# 停止 Worker
pkill -f "prefect worker"

# 启动 Worker
prefect worker start --pool default

# 检查 Worker 日志（确认加载新代码）
tail -f ~/.prefect/logs/worker-*.log
```

### Q2: 如何确认使用的是新版本代码？

**A:** 查看日志中的关键字

```bash
# 新版本会有 "异步" 标记
tail -f backend/logs/app.log | grep "异步"

# 输出示例：
# 开始运行扫描工具（异步）: amass - 目标: example.com
# ✓ 扫描完成（异步）: amass - 结果文件: ...
```

### Q3: 异步版本性能会下降吗？

**A:** 不会，可能还会略好

- 协程比线程更轻量（内存占用更低）
- I/O 密集型任务（扫描）不受 GIL 影响
- 事件循环切换比线程切换更快

### Q4: 如果出问题如何快速回滚？

**A:** 三步回滚

```bash
# 1. 恢复代码
git checkout HEAD -- apps/scan/flows/subdomain_discovery_flow.py

# 2. 重启 Worker
pkill -f "prefect worker"
prefect worker start --pool default

# 3. 验证
curl http://localhost:8888/api/scans/ -X POST ...
```

### Q5: 为什么 merge 和 save Task 不需要改成异步？

**A:** 它们没有使用 `.submit()`，是顺序调用的

```python
# 这些是直接调用，不是 .submit()
merged_file = merge_and_validate_task(...)  # ← 直接调用
saved_count = save_domains_task(...)        # ← 直接调用

# Prefect 会自动处理同步 Task 在异步 Flow 中的执行
# 不需要改成异步
```

---

## 测试命令速查

```bash
# 1. 创建扫描
curl -X POST http://localhost:8888/api/scans/ \
  -H "Content-Type: application/json" \
  -d '{"targets": [1], "engine": 1, "strategy": 1}'

# 2. 等待 5 秒

# 3. 取消扫描
curl -X POST http://localhost:8888/api/scans/{scan_id}/stop/

# 4. 检查状态（等待 5-10 秒后）
curl http://localhost:8888/api/scans/{scan_id}/ | jq '.status'
# 预期输出: "cancelled"

# 5. 检查日志
tail -f backend/logs/app.log | grep -i "on_cancellation"

# 6. 检查进程
ps aux | grep -E "amass|subfinder"
```

---

## 预期日志输出

### 成功的取消操作应该看到：

```
# 1. 扫描启动
[INFO] 开始子域名发现扫描（异步）
[INFO] 开始运行扫描工具（异步）: amass - 目标: example.com
[INFO] 开始运行扫描工具（异步）: subfinder - 目标: example.com

# 2. 收到取消信号
[WARNING] 扫描任务被取消: amass - 目标: example.com
[INFO] 终止外部进程: amass (PID: 12345)
[INFO] ✓ 进程已终止: amass

# 3. Handler 触发
[WARNING] ✗ Flow 状态回调：扫描状态已更新为 CANCELLED - Scan ID: 123

# 4. 清理完成
[WARNING] 子域名发现扫描被取消 - Scan ID: 123
```

---

## 关键文件路径

```
backend/
├── apps/scan/
│   ├── tasks/subdomain_discovery/
│   │   ├── run_scanner_task.py              # 旧版本（保留）
│   │   ├── run_scanner_task_async.py        # ← 新建
│   │   ├── merge_and_validate_task.py       # 不改
│   │   ├── save_domains_task.py             # 不改
│   │   └── __init__.py                      # ← 修改导出
│   ├── flows/
│   │   └── subdomain_discovery_flow.py      # ← 主要修改
│   └── handlers/
│       └── initiate_scan_flow_handlers.py   # 不改
└── docs/
    ├── ASYNC_MIGRATION_PLAN.md              # 详细方案
    ├── ASYNC_MIGRATION_QUICK_REFERENCE.md   # 本文档
    └── code_examples/
        ├── run_scanner_task_async.py.example
        ├── subdomain_discovery_flow_async.py.example
        └── test_cancel.sh
```

---

## 成功标准

✅ **必须达到：**
- 扫描能正常执行
- 取消后状态更新为 `CANCELLED`
- `on_cancellation` handler 被触发
- 外部进程被正确终止

✅ **验证方法：**
- 运行 `test_cancel.sh` 脚本
- 所有检查项通过
- 日志中看到 `on_cancellation` 触发

---

**文档版本：** v1.0  
**适用版本：** Prefect 3.x + Python 3.10+  
**最后更新：** 2025-11-10
