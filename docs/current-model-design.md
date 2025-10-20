# my-vulun-scan 数据模型设计：当前实现版本

基于 GORM 的数据库模型设计文档，针对 my-vulun-scan 开源 Web 应用侦察工具的核心模型。

## 核心领域模型
### Organization 模型
**作用**: 组织管理，实现多个 Domain 的分组

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| Name | string(255) | 唯一，非空 | - | 组织名称 |
| Description | varchar(1000) | 可为空 | NULL | 描述信息 |

**关系**:
- Many2Many: Domains (通过 organization_domains 关联表)

### organization_domains 关联表
**作用**: Organization 和 Domain 的多对多关联表

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| organization_id | uint | 主键，非空 | - | 组织ID，外键关联 organizations 表 |
| domain_id | uint | 主键，非空 | - | 域名ID，外键关联 domains 表 |

**约束**:
- **复合主键**: (organization_id, domain_id) - 确保每个组织-域名组合只能存在一条记录
- **外键约束**: organization_id → organizations.id (CASCADE DELETE)
- **外键约束**: domain_id → domains.id (CASCADE DELETE)
- **唯一性保证**: 通过复合主键自动防止同一组织重复关联同一域名


**关系**:
- BelongsTo: Organization
- BelongsTo: Domain

### Domain 模型
**作用**: 侦察目标的核心实体，专门表示域名

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键，索引 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| Name | string(255) | 唯一，非空，索引，**强制小写存储** (应用层转换 + CHECK约束) | - | 完整的域名 FQDN（如 example.com，统一小写存储） |
| Description | varchar(1000) | 可为空 | NULL | 描述信息 |

**业务逻辑**:
- **自动创建根子域名**: 创建 Domain 时，系统自动创建一个同名的 Subdomain 作为根子域名（IsRoot = true），用于关联主域名的 URL
- **根子域名保护**: 自动创建的根子域名受保护，不允许被手动删除，只能通过删除 Domain 时级联删除
- **小写规范化**: Name 字段在应用层统一转为小写存储，数据库层通过 `CHECK (name = LOWER(name))` 约束防止插入大写值

**关系**:
- HasMany: Subdomains (包括自动创建的根子域名)
- HasMany: Vulnerabilities
- Many2Many: Organizations (通过 organization_domains 关联表)


### Subdomain 模型
**作用**: 子域名发现和特征信息存储（包括根子域名）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键，索引 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| Name | string(255) | 非空，索引，唯一，只读(创建后)，**强制小写存储** (应用层转换 + CHECK约束) | - | 完整的子域名 FQDN（如 api.example.com，统一小写存储，根子域名与 Domain 同名） |
| DomainID | uint | 非空，外键，索引，只读(创建后) | - | 所属域名ID |
| IsRoot | bool | 非空，索引，只读(创建后) | false | 是否为根子域名（Domain 自动创建的同名子域名，受保护不允许删除） |

**约束**:
- **唯一索引**: (domain_id, name) - 确保同一域名下不会出现重复的子域名
- **外键约束**: domain_id → domains.id (CASCADE DELETE)

**业务逻辑**:
- **根子域名**: 每个 Domain 创建时自动生成一个同名的 Subdomain（如 Domain 为 `example.com`，则根子域名也为 `example.com`），用于关联主域名的 URL
- **根子域名保护**: 通过 `IsRoot` 字段标记 Domain 专属的根子域名（IsRoot = true），这些根子域名**不允许被手动删除**，只能通过删除 Domain 时级联删除
  - 创建 Domain 时自动创建的同名 Subdomain 会设置 IsRoot = true
  - 用户手动创建的子域名（如 media.baidu.com）IsRoot = false，可以正常删除
  - 尝试删除根子域名时会返回错误信息，列出受保护的根子域名列表
- **外键字段**: `DomainID` - 通过此字段建立与 Domain 的关联
- **级联删除**: 删除域名时自动删除相关子域名（包括根子域名，通过数据库级联删除实现）
- **小写规范化**: Name 字段在应用层统一转为小写存储，数据库层通过 `CHECK (name = LOWER(name))` 约束防止插入大写值
- **FQDN 存储**: Name 字段存储完整的子域名 FQDN（如 `api.example.com`、`www.example.com`），不同域名的子域名 FQDN 天然不同，不会冲突
- **子域名归属验证**: 创建子域名时验证是否以 `.父域名` 结尾或与父域名相同（根子域名），防止将独立域名错误添加为子域名
- **禁止更新**: Name、DomainID 和 IsRoot 创建后不可修改（`<-:create`），如需变更请删除重建，保证数据一致性和完整性

**关系**:
- BelongsTo: Domain (通过 DomainID 外键关联)
- HasMany: URLs
- HasMany: Vulnerabilities


### URL 模型
**作用**: 存储发现的 URL 信息（包括完整的 URL、HTTP 探测结果等）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键，索引 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| URL | string(2048) | 非空，唯一索引 | - | 完整的 URL（包括协议、域名、路径、查询参数等，如 https://www.baidu.com/a/b?a=123） |
| Method | string(10) | 可为空 | NULL | HTTP方法(GET/POST/PUT/DELETE等) |
| StatusCode | int | 可为空 | NULL | HTTP响应状态码 |
| Title | string(255) | 可为空 | NULL | 页面标题 |
| ContentLength | int64 | 可为空 | NULL | 响应内容长度(字节) |
| SubdomainID | uint | 非空，外键，索引，只读(创建后) | - | 所属子域名ID |
| DomainID | uint | 非空，外键，索引，只读(创建后) | - | 所属域名ID（冗余字段，性能优化） |

**业务逻辑约束**:
- **统一归属**: 所有 URL 必须属于某个 Subdomain 和 DomainID
- **级联删除**: 删除子域名或域名时自动删除相关 URL
- **禁止更新**: SubdomainID 和 DomainID 创建后不可修改，如需变更请删除重建

**性能优化说明**:
- 添加 DomainID 冗余字段，查询组织下的所有 URL 只需 1 次 JOIN（从 3 次降低）
- 查询路径优化：Organization → organization_domains → URL (通过 domain_id)
- 复合索引：(domain_id, subdomain_id) 优化多维度查询

**关系**:
- BelongsTo: Subdomain (通过 SubdomainID 外键关联)
- BelongsTo: Domain (通过 DomainID 外键关联，冗余字段)
- HasMany: Vulnerabilities

**注意**: 数据库表名仍为 `endpoints`，但语义上应理解为 URL 模型


## 工具执行与工作流模型

### Tool 模型
**作用**: 管理安全扫描工具信息及其安装、更新配置（支持开源工具和自定义工具）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| Name | string(255) | 非空，索引，唯一 | - | 工具名称 |
| Type | string(20) | 非空，索引 | opensource | 工具类型：opensource（开源工具）/ custom（自定义工具） |
| RepoURL | string(512) | 可为空 | NULL | 开源项目地址（开源工具使用） |
| Version | string(100) | 可为空 | NULL | 当前安装的工具版本号 |
| Description | text | 可为空 | NULL | 工具描述 |
| CategoryNames | JSON | 可为空 | NULL | 工具分类标签数组 |
| Directory | string(512) | 可为空 | NULL | 工具路径（自定义工具的脚本所在目录） |
| InstallCommand | text | 可为空 | NULL | 安装命令（开源工具必填，如 git clone 或 go install） |
| UpdateCommand | text | 可为空 | NULL | 更新命令（开源工具必填，如 git pull 或 go install） |
| VersionCommand | string(500) | 可为空 | NULL | 版本查询命令（开源工具必填，如 toolname --version） |

**工具分类 (CategoryNames) 推荐值**:
- `subdomain` - 子域名扫描（如 subfinder, sublist3r）
- `vulnerability` - 漏洞扫描（如 nuclei）
- `port` - 端口扫描（如 naabu, masscan）
- `directory` - 目录扫描（如 dirsearch, gobuster）
- `dns` - DNS解析（如 dnsx, massdns）
- `http` - HTTP探测（如 httpx, httprobe）
- `crawler` - 网页爬虫（如 katana, gospider）
- `recon` - 信息收集（如 amass, theHarvester）
- `fuzzer` - 模糊测试（如 ffuf, wfuzz）
- `wordlist` - 字典生成（如 alterx, cewl）
- `screenshot` - 截图工具（如 gowitness, aquatone）
- `exploit` - 漏洞利用（如 sqlmap, metasploit）
- `network` - 网络扫描（如 masscan, zmap）

**数据示例**:
```json
// 开源工具示例 - 单个分类
{
  "name": "nuclei",
  "type": "opensource",
  "category_names": ["vulnerability"],
  "repo_url": "https://github.com/projectdiscovery/nuclei",
  "version": "v3.0.0",
  "install_command": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
  "update_command": "go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest",
  "version_command": "nuclei -version"
}

// 开源工具示例 - 多个分类（如 nmap 既能端口扫描，也能漏洞扫描）
{
  "name": "nmap",
  "type": "opensource",
  "category_names": ["port", "vulnerability", "network"],
  "install_command": "apt install nmap",
  "update_command": "apt update && apt upgrade nmap",
  "version_command": "nmap --version"
}

// 自定义工具示例
{
  "name": "自定义端口扫描",
  "type": "custom",
  "category_names": ["port-scan", "network"],
  "description": "基于 Python 的自定义端口扫描脚本",
  "directory": "/opt/security-tools/port-scanner"
}
```

**工具类型说明**:
- **opensource（开源工具）**: 从 GitHub 等开源平台获取的工具
  - 必须提供：InstallCommand、UpdateCommand、VersionCommand、RepoURL
  - 可选提供：Version
  - 示例：nuclei、subfinder、httpx 等
- **custom（自定义工具）**: 用户自己编写的脚本和工具
  - 必须提供：Directory（脚本所在目录）
  - 示例：自定义 Python 脚本、Bash 脚本等

**命令配置说明**（仅开源工具需要）:
- **InstallCommand**: 工具安装命令
  - Git 方式：`git clone https://github.com/user/tool`
  - Go 方式：`go install -v github.com/tool@latest`
  - ⚠️ 注意：命令将直接在 Shell 中执行，请确保安全性
  - ⚠️ 注意：go get 已弃用，请使用 go install
- **UpdateCommand**: 工具更新命令
  - Git 工具推荐：`git pull`
  - Go 工具推荐：使用相同的 go install 命令
- **VersionCommand**: 版本查询命令
  - 系统会使用此命令检查工具版本并提示更新
  - 常见格式：`toolname --version`、`toolname -v`、`python tool.py -v`
  - 前端会根据工具名称和安装命令自动生成建议值

**目录配置说明**（仅自定义工具需要）:
- **Directory**: 工具路径
  - 指定自定义脚本所在的目录路径
  - 示例：`/opt/security-tools/port-scanner`
  - 系统会在此目录下查找和执行脚本

**查询说明**:

- 使用 PostgreSQL JSONB 操作符查询：
  - 包含某个标签：`category_names @> '["subdomain"]'`
  - 包含任意标签：`category_names ?| array['port', 'vulnerability']`
  - 包含所有标签：`category_names ?& array['port', 'vulnerability']`
- 支持多标签筛选和组合查询

**索引优化**:
- Name 字段建立索引（支持工具名称查询）
- CategoryNames 建议使用 JSONB 类型并创建 GIN 索引：`CREATE INDEX idx_tools_category_names ON tools USING GIN (category_names);`

**关系**:
- HasMany: Commands（一个工具可以有多个执行命令配置）

---

### Command 模型
**作用**: 定义工具的具体执行命令（单个可执行的原子任务）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| ToolID | uint | 非空，外键，索引 | - | 所属工具ID |
| Name | string(255) | 非空 | - | 命令标识名（如 nuclei-cve-scan, subfinder-discover |
| Description | text | 可为空 | NULL | 命令描述 |
| CommandTemplate | text | 非空 | - | 命令模板（如 nuclei -u {target} -t {templates} -o {output}） |

**命令模板说明**:
- 参数占位符格式：`{变量名}`
- 示例：`nuclei -u {target} -t {templates} -o {output}`
- 执行时通过简单字符串替换将占位符替换为实际参数值
- 格式简单通用，不依赖特定编程语言

**关系**:

- BelongsTo: Tool（通过 ToolID 外键关联）
- HasMany: WorkflowSteps（可以被多个工作流步骤使用）

**数据示例**:

```json
{
  "id": 1,
  "tool_id": 1,
  "name": "nuclei-cve-scan",
  "display_name": "Nuclei CVE 全量扫描",
  "description": "使用 Nuclei 进行 CVE 漏洞全量扫描",
  "command_template": "nuclei -u {target} -t /nuclei-templates/cves/ -o {output}"
}
```

---

### Workflow 模型
**作用**: 定义工作流（多个命令的有序组合，形成完整的扫描流程）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| Name | string(255) | 非空，唯一 | - | 工作流标识名（如 full-recon-workflow） |
| DisplayName | string(255) | 可为空 | NULL | 显示名称（如 "完整侦察扫描流程"） |
| Description | text | 可为空 | NULL | 工作流描述 |
| Category | string(100) | 可为空 | NULL | 工作流分类（recon, vulnerability_scan, full_scan 等） |
| TotalSteps | int | 非空 | 0 | 总步骤数 |
| EstimatedTime | int | 可为空 | NULL | 预估耗时（秒） |
| IsActive | bool | 非空 | true | 是否启用 |

**工作流分类 (Category)**:
- `recon` - 侦察扫描
- `vulnerability_scan` - 漏洞扫描
- `full_scan` - 完整扫描
- `quick_scan` - 快速扫描
- `custom` - 自定义工作流

**关系**:
- HasMany: WorkflowSteps（工作流包含多个步骤）
- HasMany: WorkflowExecutions（工作流的执行记录）

**数据示例**:
```json
{
  "id": 1,
  "name": "full-recon-workflow",
  "display_name": "完整侦察扫描流程",
  "description": "子域名发现 -> 存活探测 -> 漏洞扫描",
  "category": "recon",
  "total_steps": 3,
  "estimated_time": 1800,
  "is_active": true
}
```

---

### WorkflowStep 模型
**作用**: 工作流步骤（连接 Workflow 和 Command 的中间表，定义步骤顺序和参数映射）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空 | 当前时间 | 更新时间 |
| WorkflowID | uint | 非空，外键，索引 | - | 所属工作流ID |
| CommandID | uint | 非空，外键，索引 | - | 使用的命令ID |
| StepOrder | int | 非空 | - | 步骤顺序（1, 2, 3...） |
| StepName | string(255) | 可为空 | NULL | 步骤别名（如 "子域名发现"） |
| DependsOn | uint | 可为空，外键 | NULL | 依赖的上一步骤ID（用于串行执行） |
| ArgsMapping | text | 可为空 | NULL | 参数映射规则（JSON 格式，定义如何从上一步获取输入） |
| ContinueOnError | bool | 非空 | false | 失败是否继续执行后续步骤 |
| TimeoutOverride | int | 可为空 | NULL | 覆盖命令默认超时时间 |

**参数映射 (ArgsMapping) 说明**:
- JSON 格式定义参数如何传递
- 支持引用工作流入参：`{workflow.target}`
- 支持引用上一步输出：`{step1.output}`
- 示例：
```json
{
  "target": "{workflow.target}",
  "input_file": "{step1.output}",
  "output": "/tmp/step2-result.txt"
}
```

**关系**:
- BelongsTo: Workflow（通过 WorkflowID 外键关联）
- BelongsTo: Command（通过 CommandID 外键关联）
- BelongsTo: WorkflowStep（自引用，通过 DependsOn 外键关联）

**约束**:
- 复合唯一索引：(workflow_id, step_order) - 同一工作流中步骤顺序不能重复

**数据示例**:
```json
{
  "id": 1,
  "workflow_id": 1,
  "command_id": 1,
  "step_order": 1,
  "step_name": "子域名发现",
  "depends_on": null,
  "args_mapping": "{\"domain\": \"{workflow.target}\", \"output\": \"/tmp/subdomains.txt\"}",
  "continue_on_error": false
}
```

---

### WorkflowExecution 模型
**作用**: 工作流执行记录（记录工作流的每次执行）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| WorkflowID | uint | 非空，外键，索引 | - | 所属工作流ID |
| Status | string(50) | 非空，索引 | queued | 执行状态 |
| CurrentStep | int | 非空 | 0 | 当前执行到第几步 |
| InputArgs | text | 可为空 | NULL | 工作流入参（JSON 格式） |
| TotalDuration | int | 可为空 | NULL | 总耗时（秒） |
| ErrorMessage | text | 可为空 | NULL | 错误信息 |
| StartedAt | time.Time | 可为空 | NULL | 开始时间 |
| FinishedAt | time.Time | 可为空 | NULL | 结束时间 |

**执行状态 (Status)**:
- `queued` - 已入队
- `running` - 执行中
- `completed` - 已完成
- `failed` - 执行失败
- `canceled` - 已取消

**关系**:
- BelongsTo: Workflow（通过 WorkflowID 外键关联）
- HasMany: StepExecutions（包含多个步骤执行记录）

**数据示例**:
```json
{
  "id": 123,
  "workflow_id": 1,
  "status": "running",
  "current_step": 2,
  "input_args": "{\"target\": \"example.com\"}",
  "started_at": "2025-10-18T10:00:00+08:00"
}
```

---

### StepExecution 模型
**作用**: 步骤执行记录（记录工作流中每个步骤的执行详情）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空 | 当前时间 | 更新时间 |
| WorkflowExecutionID | uint | 非空，外键，索引 | - | 所属工作流执行ID |
| WorkflowStepID | uint | 非空，外键，索引 | - | 对应的工作流步骤ID |
| Status | string(50) | 非空，索引 | pending | 执行状态 |
| ExitCode | int | 可为空 | NULL | 退出码（0=成功） |
| Pid | int | 可为空 | NULL | 进程ID |
| RenderedCommand | text | 可为空 | NULL | 渲染后的完整命令 |
| LogFilePath | string(512) | 可为空 | NULL | 日志文件路径 |
| OutputFilePath | string(512) | 可为空 | NULL | 输出文件路径 |
| ErrorMessage | text | 可为空 | NULL | 错误信息 |
| StartedAt | time.Time | 可为空 | NULL | 开始时间 |
| FinishedAt | time.Time | 可为空 | NULL | 结束时间 |
| Duration | int | 可为空 | NULL | 耗时（秒） |

**执行状态 (Status)**:
- `pending` - 待执行
- `running` - 执行中
- `completed` - 已完成
- `failed` - 执行失败
- `skipped` - 已跳过

**关系**:
- BelongsTo: WorkflowExecution（通过 WorkflowExecutionID 外键关联）
- BelongsTo: WorkflowStep（通过 WorkflowStepID 外键关联）

**数据示例**:
```json
{
  "id": 1,
  "workflow_execution_id": 123,
  "workflow_step_id": 1,
  "status": "completed",
  "exit_code": 0,
  "pid": 12345,
  "rendered_command": "subfinder -d example.com -o /tmp/subdomains.txt",
  "log_file_path": "/var/log/executions/step-1.log",
  "output_file_path": "/tmp/subdomains.txt",
  "started_at": "2025-10-18T10:00:05+08:00",
  "finished_at": "2025-10-18T10:02:10+08:00",
  "duration": 125
}
```

---

### 工作流模型关系图

```
Tool (工具管理)
  └─ HasMany → Command (命令定义)
                  └─ BelongsToMany → WorkflowStep (工作流步骤)
                                        └─ BelongsTo → Workflow (工作流)
                                                         └─ HasMany → WorkflowExecution (工作流执行)
                                                                        └─ HasMany → StepExecution (步骤执行)
```

**数据流转示例**:
```
1. 用户创建 Workflow（完整侦察扫描）
2. Workflow 包含 3 个 WorkflowStep：
   - Step 1: 使用 Command(subfinder-discover)
   - Step 2: 使用 Command(httpx-probe)，依赖 Step 1
   - Step 3: 使用 Command(nuclei-cve-scan)，依赖 Step 2
3. 用户执行 Workflow，创建 WorkflowExecution
4. 系统按顺序执行步骤，每步创建 StepExecution
5. 步骤间通过 ArgsMapping 传递数据（上一步输出 → 下一步输入）
```


### Vulnerability 模型
**作用**: 漏洞信息和安全评估结果

**严重等级定义**:
- -1: unknown (未知)
- 0: info (信息级)
- 1: low (低危)
- 2: medium (中危)
- 3: high (高危)
- 4: critical (严重)

**优化说明**: 新增 DomainName 冗余字段减少联表；分区表建议（按 Severity）；加密 CurlCommand 如果敏感。

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| ID | uint | 主键，索引 | 自增 | 主键标识符 |
| CreatedAt | time.Time | 非空 | 当前时间 | 创建时间 |
| UpdatedAt | time.Time | 非空，索引 | 当前时间 | 更新时间 |
| Title | string(500) | 非空 | - | 漏洞名称 |
| CVE | string(50) | 可为空，索引 | NULL | CVE 编号 |
| Description | text | 可为空 | NULL | 漏洞描述 |
| Severity | int | 非空，索引 | -1 | 严重等级 |
| CVSS | float64 | 可为空 | 0 | CVSS 分数 |
| RiskScore | int | 非空 | - | 风险评分 |
| DiscoveredDate | time.Time | 非空，索引 | - | 发现时间 |
| Status | string(50) | 非空，索引 | - | 漏洞状态 |
| Domain | string(255) | 非空 | - | 目标域名 |
| Port | int | 非空 | - | 端口号 |
| Service | string(100) | 可为空 | NULL | 服务名称 |
| AffectedURL | string(1000) | 可为空 | NULL | 受影响URL |
| Organization | string(255) | 可为空 | NULL | 组织名称 |
| OrganizationID | string | 非空 | - | 组织ID |
| POC | varchar(4096) | 可为空 | NULL | POC信息 |
| Solution | varchar(2000) | 可为空 | NULL | 解决方案 |
| Impact | varchar(1000) | 可为空 | NULL | 影响评估 |
| Remediation | varchar(1000) | 可为空 | NULL | 修复建议 |
| ExtractedResults | []string | 可为空 | [] | 提取结果 |
| CVSSMetrics | string(500) | 可为空 | NULL | CVSS 向量 |
| CurlCommand | string(4096) | 可为空 | NULL | 复现命令 |
| Type | string(100) | 可为空 | NULL | 漏洞类型 |
| HTTPURL | string(2048) | 可为空 | NULL | 漏洞 URL |
| OpenStatus | bool | 可为空 | true | 开放状态 |
| HackeroneReportID | string(50) | 可为空 | NULL | HackerOne 报告 ID |
| Request | varchar(8192) | 可为空 | NULL | 请求包 |
| Response | varchar(8192) | 可为空 | NULL | 响应包 |
| IsGPTUsed | bool | 可为空 | false | 是否使用 GPT |
| ScanHistoryID | uint | 非空 | - | 扫描历史 ID |
| SubdomainID | uint | 可为空，外键，复合索引 | NULL | 所属子域名 ID |
| URLID | uint | 可为空，外键，复合索引 | NULL | 所属 URL ID |
| DomainID | uint | 可为空，外键，复合索引 | NULL | 目标域名 ID |
| DomainName | string(255) | 可为空 | NULL | 冗余域名名称（优化查询） |

**业务逻辑约束**:
- **灵活归属**: DomainID、SubdomainID 和 URLID 至少有一个非空
- **级联删除**: 删除域名、子域名或 URL 时自动删除相关漏洞
- **严重等级**: Severity 字段必须在 -1 到 4 范围内
- **复合索引**: (DomainID, SubdomainID, URLID) 优化关联查询

**关系**:
- BelongsTo: Domain (通过 DomainID 外键关联，可选)
- BelongsTo: Subdomain (通过 SubdomainID 外键关联，可选)
- BelongsTo: URL (通过 URLID 外键关联，可选)

## 设计原则

### 核心领域模型
1. **以 Domain 为中心**: 所有侦察活动围绕 Domain 实体展开，Domain 专门用于表示域名，关联子域名和组织。
2. **规范化设计**: 避免数据冗余，保持关系完整性，使用 BelongsTo、HasMany 和 Many2Many 关系。
3. **查询优化**: 使用 GORM 的索引标签（如 `gorm:"index"`）和预加载（Preload）优化性能。
4. **级联删除**: 删除父级记录时自动删除关联的子级记录，保持数据一致性。
5. **数据保护**: 根子域名通过 IsRoot 字段标记并受保护，防止误删除 Domain 的专属子域名，确保数据完整性。
6. **性能提升**: 统一字段长度减少碎片。
7. **数据规范化**: 域名和子域名统一使用小写存储，通过应用层转换和数据库 CHECK 约束双重保障数据一致性。

### 工作流模型
1. **四层架构**: Tool（工具管理） → Command（命令定义） → Workflow（工作流） → Execution（执行记录）
2. **职责分离**: 
   - Tool 只管理工具生命周期（安装、更新、版本）
   - Command 定义具体执行命令（命令模板、参数、超时）
   - Workflow 编排多个命令形成流程
   - Execution 记录执行历史和状态
3. **灵活编排**: 通过 WorkflowStep 中间表实现命令的灵活组合和顺序控制
4. **数据传递**: 通过 ArgsMapping 实现步骤间的数据流转（上一步输出 → 下一步输入）
5. **可扩展性**: 一个工具可以有多个命令配置，一个命令可以被多个工作流使用
6. **执行追踪**: 完整记录工作流和步骤的执行状态、日志、结果，便于调试和审计



## 实体关系图

```mermaid
erDiagram
    Organization }o--o{ organization_domains : "管理"
    Domain }o--o{ organization_domains : "属于"
    Domain ||--o{ Subdomain : "包含子域名(含根子域名)"
    Domain ||--o{ URL : "包含URL(冗余关联)"
    Domain ||--o{ Vulnerability : "包含漏洞"
    Subdomain ||--o{ URL : "包含URL"
    Subdomain ||--o{ Vulnerability : "包含漏洞"
    URL ||--o{ Vulnerability : "包含漏洞"
    
    Tool ||--o{ Command : "包含命令"
    Command ||--o{ WorkflowStep : "被步骤使用"
    Workflow ||--o{ WorkflowStep : "包含步骤"
    Workflow ||--o{ WorkflowExecution : "执行记录"
    WorkflowExecution ||--o{ StepExecution : "步骤执行记录"
    WorkflowStep ||--o{ StepExecution : "对应执行"
    
    Organization {
        uint id PK
        string name
        string description
        time created_at
        time updated_at
    }
    
    Domain {
        uint id PK
        string name
        string description
        time created_at
        time updated_at
    }
    
    Subdomain {
        uint id PK
        string name
        uint domain_id FK
        bool is_root
        time created_at
        time updated_at
    }
    
    URL {
        uint id PK
        string url
        string method
        int status_code
        string title
        int64 content_length
        uint subdomain_id FK
        uint domain_id FK
        time created_at
        time updated_at
    }
    
    Vulnerability {
        uint id PK
        string title
        string cve
        text description
        int severity
        float64 cvss
        int risk_score
        time discovered_date
        string status
        string domain
        int port
        string service
        string affected_url
        string organization
        string organization_id
        string poc
        string solution
        string impact
        string remediation
        string extracted_results
        string cvss_metrics
        string curl_command
        string type
        string http_url
        bool open_status
        string hackerone_report_id
        string request
        string response
        bool is_gpt_used
        uint scan_history_id
        uint subdomain_id FK
        uint endpoint_id FK
        uint domain_id FK
        string domain_name
        time created_at
        time updated_at
    }
    
    Tool {
        uint id PK
        string name
        string type
        string repo_url
        string version
        text description
        json category_names
        string directory
        text install_command
        text update_command
        string version_command
        time created_at
        time updated_at
    }
    
    Command {
        uint id PK
        uint tool_id FK
        string name
        string display_name
        text description
        text command_template
        bool is_active
        time created_at
        time updated_at
    }
    
    Workflow {
        uint id PK
        string name
        string display_name
        text description
        string category
        int total_steps
        int estimated_time
        bool is_active
        time created_at
        time updated_at
    }
    
    WorkflowStep {
        uint id PK
        uint workflow_id FK
        uint command_id FK
        int step_order
        string step_name
        uint depends_on FK
        text args_mapping
        bool continue_on_error
        int timeout_override
        time created_at
        time updated_at
    }
    
    WorkflowExecution {
        uint id PK
        uint workflow_id FK
        string status
        int current_step
        text input_args
        int total_duration
        text error_message
        time started_at
        time finished_at
        time created_at
        time updated_at
    }
    
    StepExecution {
        uint id PK
        uint workflow_execution_id FK
        uint workflow_step_id FK
        string status
        int exit_code
        int pid
        text rendered_command
        string log_file_path
        string output_file_path
        text error_message
        time started_at
        time finished_at
        int duration
        time created_at
        time updated_at
    }
    
    organization_domains {
        uint organization_id PK
        uint domain_id PK
    }
