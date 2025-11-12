# 端口扫描 Flow 审查（`backend/apps/scan/flows/port_scan_flow.py`）

## 逻辑 / Bug
- **Naabu 输出格式与解析器不匹配**：Flow 中的 Naabu 命令（`backend/apps/scan/flows/port_scan_flow.py:15-19`）仅使用 `-o` 写入纯文本，而解析任务 `parse_naabu_result_task` 明确期望 JSONL（`backend/apps/scan/tasks/port_scan/parse_result_task.py:1-149`）。当前组合会导致每一行都触发 `json.JSONDecodeError`，结果保存阶段拿不到任何端口数据。需在命令里加 `-json`/`-jsonl` 或提供对应的文本解析器。
- **工具级超时时间被忽略**：提交任务时统一传入 `dynamic_timeout`（`backend/apps/scan/flows/port_scan_flow.py:147-156`），完全忽略 `PORT_SCANNER_CONFIGS` 中为工具单独配置的 `timeout`。这样一来，想给慢工具更长时间或给快工具更短时间都做不到，而且当域名多时所有工具都会被迫使用同一个巨大超时。建议改成 `timeout=config.get('timeout', dynamic_timeout)` 或取两者的较大值。
- **批次保存失败被吞掉**：`save_ports_task` 在 `_save_batch_with_retry` 返回 `{'success': False}` 时只是在日志里记录并继续（`backend/apps/scan/tasks/port_scan/save_ports_task.py:142-177`）。最终 Flow 仍返回 `success=True`，但部分端口已经丢失。建议在检测到失败批次后直接抛出异常或把失败批次详情写入返回值供上游决策。

## 性能 / 可扩展性
- **IP 查询异常强制阻塞 10 秒**：当批量查询 IPAddress 数量不足时直接 `time.sleep(10)` 再查一次（`backend/apps/scan/tasks/port_scan/save_ports_task.py:352-371`）。对于包含未知子域或并发变化的批次，这个 10 秒的硬等待会让每个批次都大幅拖慢。可以改为快速重试（例如 200~500ms 重试最多 2 次）或仅在近期刚插入 IP 时才等待。
- **命令拼接未做转义**：`run_port_scanner_task` 通过 `command.format(...)` 直接把路径插入 Shell 字符串（`backend/apps/scan/tasks/port_scan/run_port_scanner_task.py:95-114`）。若 workspace 路径包含空格或特殊字符，命令会失败。建议对 `{target_file}` / `{output_file}` 使用 `shlex.quote` 后再格式化，或者改为 `subprocess.run(list_args)`。
- **工具配置硬编码在模块里**：`PORT_SCANNER_CONFIGS` 写死在 Flow 文件中（`backend/apps/scan/flows/port_scan_flow.py:15-20`）。对于需要动态启用/禁用工具或按任务下发不同参数的情况，需要改代码才能调整，不利于扩展。可以考虑把配置移到数据库 / settings，并允许 `engine_config` 覆盖。

---

# 子域名发现 Flow 审查（`backend/apps/scan/flows/subdomain_discovery_flow.py`）

## 逻辑 / Bug
- **默认配置包含必然失败的测试工具**：`SCANNER_CONFIGS` 中的 `test_tool_timeout` 会在 1 秒超时，`test_tool_syntax_error` 命令本身语法错误（`backend/apps/scan/flows/subdomain_discovery_flow.py:31-51`）。`run_scanner_task` 在超时时会抛出 `RuntimeError`（`backend/apps/scan/tasks/subdomain_discovery/run_scanner_task.py:160-167`），Flow 在 `future.result()` 处立刻异常（`backend/apps/scan/flows/subdomain_discovery_flow.py:126-150`），因此当前代码永远无法成功完成一次真实扫描。需要把这些测试项排除或提供开关。
- **任一工具抛异常即终止整个 Flow**：即使只是一部分工具失败，`future.result()` 也会把异常往上抛，使整个 Flow 失败（`backend/apps/scan/flows/subdomain_discovery_flow.py:126-150`）。这与“过滤掉失败结果”的设计目标不符。应在 `future.result()` 周围捕获异常，记录日志并继续处理其它工具的输出。
- **没有子域时也被视为错误**：合并任务在统计行数后若 `unique_count == 0` 就抛 `RuntimeError`（`backend/apps/scan/tasks/subdomain_discovery/merge_and_validate_task.py:136-137`）。真实场景中“发现 0 个子域”应当是成功的合法结果，否则无法区分“目标没有子域”和“系统异常”。

## 性能 / 可扩展性
- **合并命令未转义路径**：命令字符串直接拼接 `{' '.join(valid_files)}`（`backend/apps/scan/tasks/subdomain_discovery/merge_and_validate_task.py:101`）。若结果目录或文件名包含空格/括号会导致 `sort` 解析失败。应对文件路径使用 `shlex.quote`，或把文件列表通过 `subprocess.run([...])` 传递。
- **缺少配置注入能力**：与端口扫描相同，`SCANNER_CONFIGS` 只能通过改代码维护，`engine_config` 参数完全未使用（`backend/apps/scan/flows/subdomain_discovery_flow.py:55-76`）。当需要按任务动态选择工具或调整超时时会非常僵硬，建议让 `engine_config`（或数据库）决定启用哪些工具。
- **合并过程启用 `capture_output=True`**：虽然 `sort` 正常情况下没有输出，但在处理千万级域名时把 stdout/stderr 全部缓冲到内存（`backend/apps/scan/tasks/subdomain_discovery/merge_and_validate_task.py:105-112`）没有必要。可以去掉 `capture_output=True`，避免在出现大量错误输出时撑爆内存。

## 其他观察
- `save_domains_task` 对失败批次同样只是记录（`backend/apps/scan/tasks/subdomain_discovery/save_domains_task.py:90-171`）。如果需要“最终一致性”，建议把失败批次写入返回值或直接抛出异常，以免 Flow 返回成功却丢数据。
- `run_scanner_task` 的 stdout 被完全丢弃（`backend/apps/scan/tasks/subdomain_discovery/run_scanner_task.py:105-114`）。对于只支持 stdout 输出的工具（例如部分定制脚本），需要额外选项才能兼容，可在命令模板里提供可配置的 `sink` 或允许不丢弃 stdout。

