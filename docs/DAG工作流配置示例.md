# DAG 工作流配置示例

## 简单示例（仅子域名发现）

```yaml
subdomain_discovery:
  enabled: true
  depends_on: []
  config:
    tools: [subfinder]
    timeout: 600
```

**生成的工作流**：
```
initiate_scan
   ↓
subdomain_discovery
   ↓
finalize_scan
```

---

## 复杂示例（多任务依赖）

```yaml
# 第一阶段：子域名发现（无依赖）
subdomain_discovery:
  enabled: true
  depends_on: []
  config:
    tools: [subfinder, amass]
    timeout: 600

# 第二阶段：并行任务（依赖子域名发现）
port_scan:
  enabled: true
  depends_on: [subdomain_discovery]
  config:
    ports: [80, 443, 8080, 8443]
    scan_type: connect

tech_stack:
  enabled: true
  depends_on: [subdomain_discovery]
  config:
    tools: [wappalyzer, whatweb]

# 第三阶段：漏洞扫描（依赖端口扫描和技术栈）
vuln_scan:
  enabled: true
  depends_on: [port_scan, tech_stack]
  config:
    scan_types: [xss, sqli, ssrf]
    depth: 2
```

**生成的 DAG**：
```
initiate_scan
   ↓
Stage 1: subdomain_discovery
   ↓
   ├──────────┬──────────┐
   │          │          │
Stage 2: port_scan ∥ tech_stack (并行)
   │          │          │
   └──────────┴──────────┘
   ↓
Stage 3: vuln_scan
   ↓
finalize_scan
```

---

## 配置字段说明

### enabled
- **类型**: boolean
- **默认**: true
- **说明**: 是否启用此任务
- **示例**: `enabled: false` 将跳过此任务

### depends_on
- **类型**: list[string]
- **默认**: []
- **说明**: 此任务依赖的其他任务名称列表
- **注意**: 
  - 空列表表示无依赖，任务在第一阶段执行
  - 依赖的任务必须存在且启用
  - 不能创建循环依赖

### config
- **类型**: dict
- **说明**: 任务特定的配置参数
- **内容**: 根据任务类型不同而不同

---

## 状态流转

### 正常流程
```
Scan: INITIATED → RUNNING → SUCCESSFUL
ScanTask: PENDING → RUNNING → SUCCESSFUL
```

### 任务失败流程
```
Scan: INITIATED → RUNNING → FAILED
ScanTask: PENDING → RUNNING → FAILED
```
**说明**: 任务失败时，chain 会中断，后续任务不执行，Scan 立即标记为 FAILED

### 任务中止流程
```
Scan: INITIATED → RUNNING → ABORTED
ScanTask: PENDING → RUNNING → ABORTED
```
**说明**: 任务被中止时，Scan 立即标记为 ABORTED

---

## 添加新任务类型

### 步骤 1：创建任务文件
在 `backend/apps/scan/tasks/` 创建新任务文件，例如 `port_scan_task.py`：

```python
from celery import shared_task

@shared_task(name='port_scan')
def port_scan_task(target: str, scan_id: int, target_id: int, workspace_dir: str) -> dict:
    """端口扫描任务"""
    # 实现扫描逻辑
    return {'total': 100, 'target': target}
```

### 步骤 2：注册任务
在 `backend/apps/scan/orchestrators/dag_orchestrator.py` 的 `TASK_REGISTRY` 中注册：

```python
TASK_REGISTRY = {
    'subdomain_discovery': 'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task',
    'port_scan': 'apps.scan.tasks.port_scan_task.port_scan_task',  # 新增
}
```

### 步骤 3：配置依赖
在 Engine 配置中添加任务：

```yaml
port_scan:
  enabled: true
  depends_on: [subdomain_discovery]
  config:
    ports: [80, 443]
```

---

## 常见问题

### Q: 如何禁用某个任务？
**A**: 设置 `enabled: false`

```yaml
port_scan:
  enabled: false  # 此任务将被跳过
  depends_on: [subdomain_discovery]
```

### Q: 如何让多个任务并行执行？
**A**: 让它们依赖同一个父任务

```yaml
task_a:
  depends_on: [parent]  # 并行
task_b:
  depends_on: [parent]  # 并行
```

### Q: 循环依赖会怎样？
**A**: DAG 编排器会检测到循环依赖，工作流构建失败

```yaml
task_a:
  depends_on: [task_b]
task_b:
  depends_on: [task_a]  # ✗ 循环依赖，构建失败
```

### Q: 依赖不存在的任务会怎样？
**A**: 不存在的依赖会被忽略，并记录警告日志

---

## 调试技巧

### 查看 DAG 构建日志
```python
import logging
logging.getLogger('apps.scan.orchestrators').setLevel(logging.DEBUG)
```

### 日志输出示例
```
[INFO] ============================================================
[INFO] 开始构建动态 DAG 工作流
[INFO] ============================================================
[INFO] ✓ 添加任务: subdomain_discovery
[INFO] ============================================================
[INFO] DAG 工作流构建完成
[INFO] 总任务数: 2
[INFO] 执行阶段: 2
[INFO]   Stage 1: subdomain_discovery
[INFO]   Stage 2: finalize_scan
[INFO] ============================================================
```

---

## 最佳实践

1. **合理规划依赖关系**：避免过长的依赖链，影响并行度
2. **使用并行化**：独立的任务应该并行执行，提高效率
3. **错误处理**：任务内部应该妥善处理异常，避免整个工作流中断
4. **日志记录**：充分记录任务执行过程，便于调试
5. **超时设置**：为长时间运行的任务设置合理的超时时间

---

**文档版本**: v1.0  
**更新日期**: 2025-11-05  
**适用版本**: DAG 工作流系统 v1.0

