# XingRin 数据模型设计：当前实现版本

基于 Django ORM 的数据库模型设计文档，针对 XingRin 开源 Web 应用侦察工具的核心模型。

## 资产模型
### Organization 模型
**作用**: 组织管理，实现多个 Asset 的分组

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| name | CharField(255) | unique，非空 | - | 组织名称 |
| description | CharField(1000) | 可为空 | NULL | 描述信息 |

**业务逻辑**:
- **独立存在**: 组织可以独立存在，不需要关联任何资产
- **松散耦合**: 删除组织不会影响资产实体，只会清理关联表中的记录
- **灵活管理**: 支持先创建组织，后续再关联资产；也支持随时解除关联

**关系**:
- ManyToManyField: assets (通过 organization_assets 关联表)

**数据库表名**: `organizations`

### organization_assets 关联表
**作用**: Organization 和 Asset 的多对多关联表

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| organization_id | ForeignKey | 主键，非空 | - | 组织ID，外键关联 organizations 表 |
| asset_id | ForeignKey | 主键，非空 | - | 资产ID，外键关联 assets 表 |

**约束**:
- **复合主键**: (organization_id, asset_id) - 确保每个组织-资产组合只能存在一条记录
- **外键约束**: organization_id → organizations.id (CASCADE DELETE)
- **外键约束**: asset_id → assets.id (CASCADE DELETE)
- **唯一性保证**: 通过复合主键自动防止同一组织重复关联同一资产

**删除行为**:
- **删除组织**: 只删除关联表记录，资产实体保留（可能成为未分组资产）
- **删除资产**: 只删除关联表记录，组织实体保留
- **清理关联**: 解除关联时不影响任何一方的实体数据


**关系**:
- ForeignKey: Organization
- ForeignKey: Asset

**数据库表名**: `assets_organization_assets` (Django 自动生成)

### Asset 模型
**作用**: 侦察目标的核心实体，表示资产（目前专门表示域名，未来可扩展到 IP 等）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | AutoField | 主键，索引 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| name | CharField(255) | unique，非空，索引 | - | 完整的域名 FQDN（如 example.com） |
| description | CharField(1000) | 可为空 | NULL | 描述信息 |
| type | CharField(20) | 非空，索引 | domain | 资产类型：domain（域名）/ ip（IP地址）/ cidr（网段），自动判断|

**业务逻辑**:
- **独立存在**: 资产可以独立存在，不需要关联任何组织（允许存在未分组资产）
- **松散耦合**: 删除所有关联的组织不会删除资产本身，资产仍可正常使用
- **自动创建根域名**: 创建 Asset 时，系统自动创建一个同名的 Domain 
- **类型扩展**: type 字段支持 'domain'（域名）、'ip'（IP地址）、'cidr'（网段）等类型

**关系**:
- reverse ForeignKey: domains (包括自动创建的根域名)
- reverse ForeignKey: vulnerabilities
- ManyToManyField: organizations (通过 organization_assets 关联表)

**数据库表名**: `assets`


### Domain 模型
**作用**: 域名发现和特征信息存储（包括根域名）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | AutoField | 主键，索引 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| name | CharField(255) | unique，非空，索引 | - | 完整的域名 FQDN（如 api.example.com，根域名与 Asset 同名） |
| asset_id | ForeignKey | 非空，外键，索引 | - | 所属资产 ID，关联到 Asset 模型 |

**约束**:

- **唯一索引**: (asset_id, name) - 确保同一资产下不会出现重复的域名
- **外键约束**: asset_id → assets.id (CASCADE DELETE)

**业务逻辑**:
- **根域名**: 每个 Asset 创建时自动生成一个同名的 Domain（如 Asset 为 `example.com`，则根域名也为 `example.com`），用于关联主域名的 URL
- **外键字段**: `asset_id` - 通过此字段建立与 Asset 的关联，Django 会自动在 `asset` 字段后面加 `_id` 后缀
- **级联删除**: 删除资产时自动删除相关域名（包括根域名，通过 on_delete=CASCADE 实现）
- **FQDN 存储**: name 字段存储完整的域名 FQDN（如 `api.example.com`、`www.example.com`），不同资产的域名 FQDN 天然不同，不会冲突

**关系**:
- ForeignKey: asset (通过 asset_id 外键关联)
- reverse ForeignKey: urls
- reverse ForeignKey: vulnerabilities

**数据库表名**: `domains`


### Endpoint 模型
**作用**: 存储发现的 URL 信息（包括完整的 URL、HTTP 探测结果等）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | AutoField | 主键，索引 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| url | CharField(2048) | 非空，unique | - | 完整的 URL（包括协议、域名、路径、查询参数等，如 https://www.baidu.com/a/b?a=123） |
| method | CharField(10) | 可为空 | NULL | HTTP方法(GET/POST/PUT/DELETE等) |
| status_code | IntegerField | 可为空 | NULL | HTTP响应状态码 |
| title | CharField(255) | 可为空 | NULL | 页面标题 |
| content_length | BigIntegerField | 可为空 | NULL | 响应内容长度(字节) |
| domain_id | ForeignKey | 非空，外键，索引 | - | 所属域名 ID，关联到 Domain 模型 |
| asset_id | ForeignKey | 非空，外键，索引 | - | 所属资产 ID（冗余字段，性能优化），关联到 Asset 模型 |

**业务逻辑约束**:
- **统一归属**: 所有 URL 必须属于某个 Domain 和 Asset
- **级联删除**: 删除域名或资产时自动删除相关 URL（通过 on_delete=CASCADE 实现）

**性能优化说明**:
- 添加 AssetID 冗余字段，查询组织下的所有 URL 只需1 次 JOIN（从 3 次降低）
- 查询路径优化：Organization → organization_assets → URL (通过 asset_id)
- 复合索引：(asset_id, domain_id) 优化多维度查询

**关系**:
- ForeignKey: domain (通过 domain_id 外键关联)
- ForeignKey: asset (通过 asset_id 外键关联，冗余字段)
- reverse ForeignKey: vulnerabilities

**数据库表名**: `endpoints` (语义上应理解为 URL 模型)


## 工具执行与工作流模型

### Tool 模型
**作用**: 管理安全扫描工具信息及其安装、更新配置（支持开源工具和自定义工具）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| name | CharField(255) | 非空，索引，unique | - | 工具名称 |
| type | CharField(20) | 非空，索引 | opensource | 工具类型：opensource（开源工具）/ custom（自定义工具） |
| repo_url | CharField(512) | 可为空 | NULL | 开源项目地址（开源工具使用） |
| version | CharField(100) | 可为空 | NULL | 当前安装的工具版本号 |
| description | TextField | 可为空 | NULL | 工具描述 |
| category_names | JSONField | 可为空 | NULL | 工具分类标签数组 |
| directory | CharField(512) | 可为空 | NULL | 工具路径（自定义工具的脚本所在目录） |
| install_command | TextField | 可为空 | NULL | 安装命令（开源工具必填，如 git clone 或 go install） |
| update_command | TextField | 可为空 | NULL | 更新命令（开源工具必填，如 git pull 或 go install） |
| version_command | CharField(500) | 可为空 | NULL | 版本查询命令（开源工具必填，如 toolname --version） |

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
- reverse ForeignKey: commands（一个工具可以有多个执行命令配置）

**数据库表名**: `tools`

---

### Command 模型
**作用**: 定义工具的具体执行命令（单个可执行的原子任务）

| 字段名 | 类型 | 限制 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| tool_id | ForeignKey | 非空，外键，索引 | - | 所属工具 ID，关联到 Tool 模型 |
| name | CharField(255) | 非空 | - | 命令标识名（如 nuclei-cve-scan, subfinder-discover |
| description | TextField | 可为空 | NULL | 命令描述 |
| command_template | TextField | 非空 | - | 命令模板（如 nuclei -u {target} -t {templates} -o {output}） |

**命令模板说明**:
- 参数占位符格式：`{变量名}`
- 示例：`nuclei -u {target} -t {templates} -o {output}`
- 执行时通过简单字符串替换将占位符替换为实际参数值
- 格式简单通用，不依赖特定编程语言

**关系**:
- ForeignKey: tool（通过 tool_id 外键关联）
- reverse ForeignKey: workflow_steps（可以被多个工作流步骤使用）

**数据库表名**: `commands`

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
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| name | CharField(255) | 非空，unique | - | 工作流标识名（如 full-recon-workflow） |
| display_name | CharField(255) | 可为空 | NULL | 显示名称（如 "完整侦察扫描流程"） |
| description | TextField | 可为空 | NULL | 工作流描述 |
| category | CharField(100) | 可为空 | NULL | 工作流分类（recon, vulnerability_scan, full_scan 等） |
| total_steps | IntegerField | 非空 | 0 | 总步骤数 |
| estimated_time | IntegerField | 可为空 | NULL | 预估耗时（秒） |
| is_active | BooleanField | 非空 | true | 是否启用 |

**工作流分类 (Category)**:
- `recon` - 侦察扫描
- `vulnerability_scan` - 漏洞扫描
- `full_scan` - 完整扫描
- `quick_scan` - 快速扫描
- `custom` - 自定义工作流

**关系**:
- reverse ForeignKey: workflow_steps（工作流包含多个步骤）
- reverse ForeignKey: workflow_executions（工作流的执行记录）

**数据库表名**: `workflows`

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
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now | 当前时间 | 更新时间 |
| workflow_id | ForeignKey | 非空，外键，索引 | - | 所属工作流 ID，关联到 Workflow 模型 |
| command_id | ForeignKey | 非空，外键，索引 | - | 使用的命令 ID，关联到 Command 模型 |
| step_order | IntegerField | 非空 | - | 步骤顺序（1, 2, 3...） |
| step_name | CharField(255) | 可为空 | NULL | 步骤别名（如 "子域名发现"） |
| depends_on | ForeignKey | 可为空，外键 | NULL | 依赖的上一步骤 ID（用于串行执行） |
| args_mapping | TextField | 可为空 | NULL | 参数映射规则（JSON 格式，定义如何从上一步获取输入） |
| continue_on_error | BooleanField | 非空 | false | 失败是否继续执行后续步骤 |
| timeout_override | IntegerField | 可为空 | NULL | 覆盖命令默认超时时间 |

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
- ForeignKey: workflow（通过 workflow_id 外键关联）
- ForeignKey: command（通过 command_id 外键关联）
- ForeignKey: depends_on（自引用，关联到 WorkflowStep 模型）

**数据库表名**: `workflow_steps`

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
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| workflow_id | ForeignKey | 非空，外键，索引 | - | 所属工作流 ID，关联到 Workflow 模型 |
| status | CharField(50) | 非空，索引 | queued | 执行状态 |
| current_step | IntegerField | 非空 | 0 | 当前执行到第几步 |
| input_args | TextField | 可为空 | NULL | 工作流入参（JSON 格式） |
| total_duration | IntegerField | 可为空 | NULL | 总耗时（秒） |
| error_message | TextField | 可为空 | NULL | 错误信息 |
| started_at | DateTimeField | 可为空 | NULL | 开始时间 |
| finished_at | DateTimeField | 可为空 | NULL | 结束时间 |

**执行状态 (Status)**:
- `queued` - 已入队
- `running` - 执行中
- `completed` - 已完成
- `failed` - 执行失败
- `canceled` - 已取消

**关系**:
- ForeignKey: workflow（通过 workflow_id 外键关联）
- reverse ForeignKey: step_executions（包含多个步骤执行记录）

**数据库表名**: `workflow_executions`

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
| id | AutoField | 主键 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now | 当前时间 | 更新时间 |
| workflow_execution_id | ForeignKey | 非空，外键，索引 | - | 所属工作流执行 ID，关联到 WorkflowExecution 模型 |
| workflow_step_id | ForeignKey | 非空，外键，索引 | - | 对应的工作流步骤 ID，关联到 WorkflowStep 模型 |
| status | CharField(50) | 非空，索引 | pending | 执行状态 |
| exit_code | IntegerField | 可为空 | NULL | 退出码（0=成功） |
| pid | IntegerField | 可为空 | NULL | 进程 ID |
| rendered_command | TextField | 可为空 | NULL | 渲染后的完整命令 |
| log_file_path | CharField(512) | 可为空 | NULL | 日志文件路径 |
| output_file_path | CharField(512) | 可为空 | NULL | 输出文件路径 |
| error_message | TextField | 可为空 | NULL | 错误信息 |
| started_at | DateTimeField | 可为空 | NULL | 开始时间 |
| finished_at | DateTimeField | 可为空 | NULL | 结束时间 |
| duration | IntegerField | 可为空 | NULL | 耗时（秒） |

**执行状态 (Status)**:
- `pending` - 待执行
- `running` - 执行中
- `completed` - 已完成
- `failed` - 执行失败
- `skipped` - 已跳过

**关系**:
- ForeignKey: workflow_execution（通过 workflow_execution_id 外键关联）
- ForeignKey: workflow_step（通过 workflow_step_id 外键关联）

**数据库表名**: `step_executions`

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
| id | AutoField | 主键，索引 | 自增 | 主键标识符 |
| created_at | DateTimeField | 非空，auto_now_add | 当前时间 | 创建时间 |
| updated_at | DateTimeField | 非空，auto_now，索引 | 当前时间 | 更新时间 |
| title | CharField(500) | 非空 | - | 漏洞名称 |
| cve | CharField(50) | 可为空，索引 | NULL | CVE 编号 |
| description | TextField | 可为空 | NULL | 漏洞描述 |
| severity | IntegerField | 非空，索引 | -1 | 严重等级 |
| cvss | FloatField | 可为空 | 0 | CVSS 分数 |
| risk_score | IntegerField | 非空 | - | 风险评分 |
| discovered_date | DateTimeField | 非空，索引 | - | 发现时间 |
| status | CharField(50) | 非空，索引 | - | 漏洞状态 |
| domain | CharField(255) | 非空 | - | 目标域名 |
| port | IntegerField | 非空 | - | 端口号 |
| service | CharField(100) | 可为空 | NULL | 服务名称 |
| affected_url | CharField(1000) | 可为空 | NULL | 受影响URL |
| organization | CharField(255) | 可为空 | NULL | 组织名称 |
| organization_id | CharField | 非空 | - | 组织ID |
| poc | CharField(4096) | 可为空 | NULL | POC信息 |
| solution | CharField(2000) | 可为空 | NULL | 解决方案 |
| impact | CharField(1000) | 可为空 | NULL | 影响评估 |
| remediation | CharField(1000) | 可为空 | NULL | 修复建议 |
| extracted_results | JSONField | 可为空 | [] | 提取结果 |
| cvss_metrics | CharField(500) | 可为空 | NULL | CVSS 向量 |
| curl_command | CharField(4096) | 可为空 | NULL | 复现命令 |
| type | CharField(100) | 可为空 | NULL | 漏洞类型 |
| http_url | CharField(2048) | 可为空 | NULL | 漏洞 URL |
| open_status | BooleanField | 可为空 | true | 开放状态 |
| hackerone_report_id | CharField(50) | 可为空 | NULL | HackerOne 报告 ID |
| request | CharField(8192) | 可为空 | NULL | 请求包 |
| response | CharField(8192) | 可为空 | NULL | 响应包 |
| is_gpt_used | BooleanField | 可为空 | false | 是否使用 GPT |
| scan_history_id | IntegerField | 非空 | - | 扫描历史 ID |
| domain_id | ForeignKey | 可为空，外键，复合索引 | NULL | 所属域名 ID，关联到 Domain 模型 |
| url_id | ForeignKey | 可为空，外键，复合索引 | NULL | 所属 URL ID，关联到 URL 模型 |
| asset_id | ForeignKey | 可为空，外键，复合索引 | NULL | 目标资产 ID，关联到 Asset 模型 |
| asset_name | CharField(255) | 可为空 | NULL | 冗余资产名称（优化查询） |

**业务逻辑约束**:
- **灵活归属**: asset_id、domain_id 和 url_id 至少有一个非空
- **级联删除**: 删除资产、域名或 URL 时自动删除相关漏洞（通过 on_delete=CASCADE 实现）
- **严重等级**: severity 字段必须在 -1 到 4 范围内
- **复合索引**: (asset_id, domain_id, url_id) 优化关联查询

**关系**:
- ForeignKey: asset (通过 asset_id 外键关联，可选)
- ForeignKey: domain (通过 domain_id 外键关联，可选)
- ForeignKey: url (通过 url_id 外键关联，可选)

**数据库表名**: `vulnerabilities`

## 设计原则

### 核心领域模型
1. **以 Asset 为中心**: 所有侦察活动围绕 Asset 实体展开，Asset 表示资产（目前专门用于表示域名，未来可扩展到 IP），关联域名和组织。
2. **松散耦合设计**: Organization 和 Asset 通过 ManyToManyField 松散关联，两者可以独立存在。删除任何一方不影响另一方的实体数据，只清理关联表记录。这种设计提供了最大的灵活性，支持未分组资产、空组织等场景。
3. **规范化设计**: 避免数据冗余，保持关系完整性，使用 ForeignKey、ManyToManyField 和 reverse ForeignKey 关系。
4. **查询优化**: 使用 Django ORM 的 `db_index=True` 和 `select_related()`/`prefetch_related()` 优化性能。
5. **级联删除**: 删除父级记录时自动删除关联的子级记录（通过 `on_delete=CASCADE` 实现）。注意：仅适用于强依赖关系（如 Asset → Domain），不适用于 Organization ⇄ Asset 的松散关联。
6. **性能提升**: 统一字段长度减少碎片。

### 工作流模型
1. **四层架构**: Tool（工具管理） → Command（命令定义） → Workflow（工作流） → Execution（执行记录）
2. **职责分离**: 
   - Tool 只管理工具生命周期（安装、更新、版本）
   - Command 定义具体执行命令（命令模板、参数、超时）
   - Workflow 编排多个命令形成流程
   - Execution 记录执行历史和状态
3. **灵活编排**: 通过 WorkflowStep 中间表实现命令的灵活组合和顺序控制
4. **数据传递**: 通过 args_mapping 实现步骤间的数据流转（上一步输出 → 下一步输入）
5. **可扩展性**: 一个工具可以有多个命令配置，一个命令可以被多个工作流使用
6. **执行追踪**: 完整记录工作流和步骤的执行状态、日志、结果，便于调试和审计



## 实体关系图

```mermaid
erDiagram
    Organization }o--o{ organization_assets : "管理"
    Asset }o--o{ organization_assets : "属于"
    Asset ||--o{ Domain : "包含域名(含根域名)"
    Asset ||--o{ Endpoint : "包含URL(冗余关联)"
    Asset ||--o{ Vulnerability : "包含漏洞"
    Domain ||--o{ Endpoint : "包含URL"
    Domain ||--o{ Vulnerability : "包含漏洞"
    Endpoint ||--o{ Vulnerability : "包含漏洞"
    
    Tool ||--o{ Command : "包含命令"
    Command ||--o{ WorkflowStep : "被步骤使用"
    Workflow ||--o{ WorkflowStep : "包含步骤"
    Workflow ||--o{ WorkflowExecution : "执行记录"
    WorkflowExecution ||--o{ StepExecution : "步骤执行记录"
    WorkflowStep ||--o{ StepExecution : "对应执行"
    
    Organization {
        int id PK
        string name
        string description
        datetime created_at
        datetime updated_at
    }
    
    Asset {
        int id PK
        string name
        string description
        string type
        datetime created_at
        datetime updated_at
    }
    
    Domain {
        int id PK
        string name
        int asset_id FK
        bool is_root
        datetime created_at
        datetime updated_at
    }
    
    Endpoint {
        int id PK
        string url
        string method
        int status_code
        string title
        bigint content_length
        int domain_id FK
        int asset_id FK
        datetime created_at
        datetime updated_at
    }
    
    Vulnerability {
        int id PK
        string title
        string cve
        text description
        int severity
        float cvss
        int risk_score
        datetime discovered_date
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
        json extracted_results
        string cvss_metrics
        string curl_command
        string type
        string http_url
        bool open_status
        string hackerone_report_id
        string request
        string response
        bool is_gpt_used
        int scan_history_id
        int domain_id FK
        int url_id FK
        int asset_id FK
        string asset_name
        datetime created_at
        datetime updated_at
    }
    
    Tool {
        int id PK
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
        datetime created_at
        datetime updated_at
    }
    
    Command {
        int id PK
        int tool_id FK
        string name
        string display_name
        text description
        text command_template
        bool is_active
        datetime created_at
        datetime updated_at
    }
    
    Workflow {
        int id PK
        string name
        string display_name
        text description
        string category
        int total_steps
        int estimated_time
        bool is_active
        datetime created_at
        datetime updated_at
    }
    
    WorkflowStep {
        int id PK
        int workflow_id FK
        int command_id FK
        int step_order
        string step_name
        int depends_on FK
        text args_mapping
        bool continue_on_error
        int timeout_override
        datetime created_at
        datetime updated_at
    }
    
    WorkflowExecution {
        int id PK
        int workflow_id FK
        string status
        int current_step
        text input_args
        int total_duration
        text error_message
        datetime started_at
        datetime finished_at
        datetime created_at
        datetime updated_at
    }
    
    StepExecution {
        int id PK
        int workflow_execution_id FK
        int workflow_step_id FK
        string status
        int exit_code
        int pid
        text rendered_command
        string log_file_path
        string output_file_path
        text error_message
        datetime started_at
        datetime finished_at
        int duration
        datetime created_at
        datetime updated_at
    }
    
    organization_assets {
        int organization_id PK
        int asset_id PK
    }
