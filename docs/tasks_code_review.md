## 扫描任务模块代码评审（tasks）

本文审查以下文件的核心逻辑与实现一致性、鲁棒性、可维护性及潜在风险，并提出改进建议：
- backend/apps/scan/tasks/subdomain_discovery_task.py
- backend/apps/scan/tasks/initiate_scan_task.py
- backend/apps/scan/tasks/cleanup_old_scans_task.py
- backend/apps/scan/tasks/finalize_scan_task.py

---

### 总览结论
- 队列策略“文档 vs 实现”不一致：四个任务都没有在装饰器上明确指定 `queue`，与文件头部说明不符，存在路由偏差风险。
- 子域名发现任务对“无结果”一律按失败处理，可能导致“正常扫描但无子域名”的情况被错误标记为失败，影响最终态决策。
- 缺少对输入/输出的更严格校验与规范化（例如子域名大小写、IDNA/punycode 处理、去重）。
- 清理任务以纯时间戳为准且对目录名无约束，若配置错误指向了更宽的目录，有误删风险。
- 终结任务对 `ScanTaskStatus` 的 `label`/`value` 使用依赖外部实现约定，建议统一对外使用 value/枚举并在 service 层做转换。

---

### 详细问题与建议

#### 1) 队列策略未在代码层面落地（所有任务）
文档中声明了队列策略，但代码未在装饰器上绑定 `queue`，导致运行时依赖默认路由。建议在装饰器明确：
- orchestrator（轻量、高并发）：`initiate_scan`, `finalize_scan`, `cleanup_old_scans`
- scans（IO 密集、中等耗时）：`subdomain_discovery`

证据（片段）：

```21:24:/Users/yangyang/Desktop/scanner/backend/apps/scan/tasks/initiate_scan_task.py
@shared_task(name='initiate_scan', bind=True)
def initiate_scan_task(self, scan_id: int = None):
    """
    初始化扫描任务，根据 engine 配置动态编排和执行工作流
```

```28:33:/Users/yangyang/Desktop/scanner/backend/apps/scan/tasks/subdomain_discovery_task.py
@shared_task(name='subdomain_discovery')
def subdomain_discovery_task(target: str, scan_id: int = None, target_id: int = None, workspace_dir: str = None) -> dict:
    """
    子域名发现任务
```

```25:29:/Users/yangyang/Desktop/scanner/backend/apps/scan/tasks/cleanup_old_scans_task.py
@shared_task(name='cleanup_old_scans', bind=True)
def cleanup_old_scans_task(self) -> dict:
    """
    清理超过保留期限的扫描结果目录
```

```21:24:/Users/yangyang/Desktop/scanner/backend/apps/scan/tasks/finalize_scan_task.py
@shared_task(name='finalize_scan', bind=True)
def finalize_scan_task(self, scan_id: int = None) -> dict:
    """
    完成扫描任务
```

建议落地：
- 在装饰器增加 `queue='orchestrator'` 或 `queue='scans'`，或在 `celery routes` 里用 `task_routes` 定义基于任务名的路由，并在代码注释明确对应策略。

---

#### 2) 子域名发现任务：业务边界与失败定义偏严
文件：`subdomain_discovery_task.py`

问题：
- 若扫描结果为空（文件存在但无数据），直接抛出 `RuntimeError`（L78-L80），把“无发现”当作失败。
- 域名校验阶段如果没有任何有效项，同样抛 `RuntimeError`（L183-L187）。

影响：
- 某些目标本就没有子域名或扫描策略导致无结果，这是正常业务分支，当前实现会导致任务失败，最终 `finalize_scan` 会更倾向失败态，影响整体扫描成功率与用户预期。

建议：
- 将“无结果/无有效域名”视作成功但结果为0：返回 `{'total': 0, ...}`，并用 `logger.info` 做业务性提示，不抛异常。
- 可通过引擎配置项控制“空结果是否失败”，默认不失败。

其它改进点：
- 结果集在保存前做一次去重与标准化（`lower()`，IDNA/punycode 规范化），降低无谓 upsert 冲突与重复尝试。
- `validators.domain` 的语义需确认其是否完全覆盖 FQDN/IDN；如不满足，建议替换或增加自定义校验器，并记录被过滤的原因统计。
- 批量保存默认 `batch_size=1000` 合理，但可考虑根据结果集大小自适应或暴露配置。

---

#### 3) 子域名发现任务：异常分层与可观测性
问题：
- 将多类异常统一包成 `RuntimeError` 抛出虽便于信号处理，但不利于外部监控做精细化告警分类。

建议：
- 自定义异常层级（如 `DiscoveryNoResult`, `DiscoveryToolError`, `DiscoveryIOError`），在信号处理器中映射为 ScanTask 状态；日志中保留原始异常类型与关键信息字段，便于观察。

---

#### 4) initiate_scan：工作流触发与健壮性
文件：`initiate_scan_task.py`

肯定点：
- 在 Service 层生成路径字符串，Task 层仅负责实际目录创建，职责分离清晰。
- YAML 解析失败会记录错误并回落为空配置，随后触发 `ValueError`，可控失败。

风险/改进：
- 未显式绑定 orchestrator 队列（见问题1）。
- `workflow.apply_async()` 执行后缺少基础性保护（如任务链中断时的兜底/回滚注册）；若 `WorkflowOrchestrator` 已内含链式 `finalize_scan`，则应在此文件注释处明确与其约定；若未内含，建议在这里加上 `link_error` 或在 orchestrator 层确保最终态落地。
- 对 `scan.results_dir` 写权限/磁盘配额不足建议在进入工作流前做一次快速校验（可在 utils 层提供 `ensure_writable_dir`）。

---

#### 5) cleanup_old_scans：清理策略的安全边界
文件：`cleanup_old_scans_task.py`

问题：
- 仅基于 `mtime` 和“是否为目录”判断，未限制目录名模式（例如 `scan_YYYYMMDD_*`），若 `SCAN_RESULTS_DIR` 误配为较宽泛目录，可能误删业务无关目录。

建议：
- 增加目录名白名单/前缀校验（如以 `scan_` 开头）。
- 提供 `dry_run` 模式（通过设置值或任务参数），用于观察将要删除的目录列表并记录日志，不实际删除。
- 将“估算目录大小”的逻辑放在 `dry_run=True` 或限制深度/文件数阈值，避免在极大目录上产生显著 IO 开销。

其它改进：
- 当 `SCAN_RESULTS_DIR` 不存在时当前直接返回失败（可接受）。若是首次部署场景可返回成功并提示“目录不存在无需清理”。

---

#### 6) finalize_scan：状态决策与枚举使用
文件：`finalize_scan_task.py`

问题：
- `final_status.label` 的使用依赖 `ScanTaskStatus` 自定义实现是否具备 `label` 属性（L121）。若未来枚举改动易破坏日志格式。
- `stats` 获取失败时默认 `failed=1`（L77），会将最终态判为失败；如是“统计模块临时失败”，可能与真实子任务结果不一致。

建议：
- 对外统一使用 `final_status.value` 进行落库与返回，日志中打印 `final_status.name` 或在 service 层转换为文案。
- `get_task_stats` 失败时可标记“未知”并重试或降级为查询 ScanTask 行为（而非直接失败计数+1），避免误判。
- 在 exclude 列表中确保未来新增编排类任务名也能被正确排除（建议在 service 层以“任务类型”而非“任务名白名单”排除）。

---

### 快速落地改动建议（可选）
- 在四个任务的 `@shared_task` 增加 `queue`：
  - `initiate_scan_task`, `finalize_scan_task`, `cleanup_old_scans_task` → `queue='orchestrator'`
  - `subdomain_discovery_task` → `queue='scans'`
- `subdomain_discovery_task`：
  - 对空结果/全部无效结果改为成功返回 `total=0`，并在返回中加入 `reason` 字段（如 `"no_valid_subdomains"`）。
  - 保存前对子域名执行：`strip -> lower -> idna/punycode 规范化 -> 去重`。
- `cleanup_old_scans_task`：
  - 增加前缀过滤与 `dry_run` 支持；对于非常大的目录数，先采样或分页删除并记录进度。
- `finalize_scan_task`：
  - 统一使用 `final_status.value` 对外返回/持久化；日志打印 `name` 即可。
  - `get_task_stats` 失败时，增加一次轻量重试或回退到直接聚合 `ScanTask` 表。

---

### 可选跟踪指标（Observability）
- subdomain discovery：
  - 扫描时长、工具执行返回码、原始结果条数、有效条数、去重后条数、插入成功条数、去重/过滤原因统计。
- orchestrator：
  - 任务链构建耗时、链执行总时长、各环节入队/出队时间、失败任务的错误类型分布。
- cleanup：
  - 扫描目录数、删除目录数、跳过原因、释放空间总量、单目录处理时长分布。
- finalize：
  - 任务统计获取耗时、最终状态分布、与前一版本的状态差异（回归检测）。

