# Flow 输入参数设计改进方案

## 当前设计的问题

### 问题 1：统一参数但实际需求不同

**当前所有 Flow 接收相同参数：**
```python
def subdomain_discovery_flow(scan_id, target_name, target_id, scan_workspace_dir, engine_config):
def port_scan_flow(scan_id, target_name, target_id, scan_workspace_dir, engine_config):
def site_scan_flow(scan_id, target_name, target_id, scan_workspace_dir, engine_config):
def url_fetch_flow(scan_id, target_name, target_id, scan_workspace_dir, engine_config):
def directory_scan_flow(scan_id, target_name, target_id, scan_workspace_dir, engine_config):
```

**但实际需求完全不同：**
- **subdomain_discovery_flow**: 只需要 `domain`（字符串）
- **port_scan_flow**: 需要 `subdomains_file`（子域名列表文件）
- **site_scan_flow**: 需要 `ports_file`（端口列表文件）
- **url_fetch_flow**: 需要 `websites_file`（网站列表文件）
- **directory_scan_flow**: 需要 `websites_file`（网站列表文件）

### 问题 2：Flow 内部重复数据库查询

**port_scan_flow 当前实现：**
```python
def port_scan_flow(..., target_id, ...):
    # Step 1: 查询数据库导出子域名
    subdomains_file = export_subdomains_task(target_id, ...)
    
    # Step 2: 使用子域名文件
    run_port_scan(subdomains_file, ...)
```

**site_scan_flow 当前实现：**
```python
def site_scan_flow(..., target_id, ...):
    # Step 1: 查询数据库导出端口
    ports_file = export_ports_task(target_id, ...)
    
    # Step 2: 使用端口文件
    run_site_scan(ports_file, ...)
```

### 问题 3：Flow 与数据库耦合

- Flow 依赖数据库查询，无法独立测试
- 无法处理非数据库来源的数据（如手动上传的文件）
- Flow 职责不单一（既负责数据准备，又负责扫描执行）

### 问题 4：参数传递不语义化

```python
# 当前：传递 target_id，让 flow 自己查询
port_scan_flow(target_id=1, ...)  # 不知道需要什么数据

# 理想：直接传递需要的数据
port_scan_flow(subdomains_file='/path/to/subdomains.txt', ...)  # 清晰明了
```

---

## 改进方案：Service 层准备数据，Flow 只负责编排

### ⚠️ 重要修正

**第一版改进方案的问题：**
虽然解决了各个子 Flow 的数据库耦合，但把数据准备转移到了 `initiate_scan_flow`，这只是**把问题转移了**，并没有真正解决。

**正确的设计：**
- ✅ **Service 层**：准备所有数据（导出文件）
- ✅ **Flow 层**：只负责编排和调用，不涉及数据库
- ✅ **Task 层**：执行具体的扫描工具

### 核心原则

1. **数据准备与执行分离**
   - **ScanService**（业务层）负责数据准备（导出文件）
   - **initiate_scan_flow**（编排层）负责调度子 Flow
   - **子 Flow**（执行层）只负责扫描执行，接收纯输入

2. **Flow 完全无状态**
   - 不查询数据库
   - 不依赖外部服务
   - 只做编排和调用
   - 可独立测试

3. **参数语义化**
   - 参数名明确表达需要的数据类型
   - 不传递不需要的参数（如 target_id）

### 改进后的架构

#### 架构分层图

```
┌─────────────────────────────────────────────────────────────┐
│  ScanService (业务层)                                         │
│  - 准备数据（导出文件）                                        │
│  - 提交 Flow Run                                              │
└───────────────────┬─────────────────────────────────────────┘
                    ↓ 参数：文件路径
┌─────────────────────────────────────────────────────────────┐
│  initiate_scan_flow (编排层)                                 │
│  - 只负责调度子 Flow                                          │
│  - 不涉及数据库                                               │
└───────────────────┬─────────────────────────────────────────┘
                    ↓ 参数：文件路径
┌─────────────────────────────────────────────────────────────┐
│  子 Flow (执行层)                                             │
│  - subdomain_discovery_flow (domain)                         │
│  - port_scan_flow (subdomains_file)                          │
│  - site_scan_flow (ports_file)                               │
│  - url_fetch_flow (websites_file)                            │
└─────────────────────────────────────────────────────────────┘
```

#### 1. ScanService 层准备数据（核心改动）

```python
# apps/scan/services/scan_service.py

class ScanService:
    """扫描服务（业务层）"""
    
    def initiate_scan(self, targets, engine_id):
        """初始化扫描任务"""
        
        # ... 创建 Scan 记录 ...
        
        for scan in created_scans:
            try:
                # ==================== 重点：准备数据文件 ====================
                data_files = self._prepare_scan_data(
                    target_id=scan.target.id,
                    workspace_dir=scan.results_dir,
                    engine_config=scan.engine.configuration
                )
                
                # 准备 Flow 参数（只传递文件路径，不传 target_id）
                flow_kwargs = {
                    'scan_id': scan.id,
                    'scan_workspace_dir': scan.results_dir,
                    'engine_config': scan.engine.configuration,
                    **data_files  # 展开数据文件字典
                }
                
                # 提交 Flow Run
                flow_run_id = _submit_flow_deployment(
                    deployment_name="initiate_scan/initiate-scan-on-demand",
                    parameters=flow_kwargs
                )
                
                # ...
            except Exception as e:
                logger.error(f"提交扫描任务失败: {e}")
    
    def _prepare_scan_data(
        self,
        target_id: int,
        workspace_dir: str,
        engine_config: str
    ) -> dict:
        """
        准备扫描所需的数据文件
        
        根据 engine_config 中的配置，导出相应的数据文件
        
        Returns:
            dict: 数据文件路径字典，例如：
                {
                    'domain': 'example.com',
                    'subdomains_file': '/path/to/subdomains.txt',
                    'ports_file': '/path/to/ports.txt',
                    'websites_file': '/path/to/websites.txt'
                }
        """
        from apps.scan.orchestrators import FlowOrchestrator
        from pathlib import Path
        
        data_files = {}
        workspace_path = Path(workspace_dir)
        orchestrator = FlowOrchestrator(engine_config)
        
        # 获取目标信息
        target = Target.objects.get(id=target_id)
        data_files['domain'] = target.name  # 域名总是需要的
        
        # 根据配置导出数据文件
        if 'port_scan' in orchestrator.scan_types:
            # 导出子域名文件
            data_files['subdomains_file'] = self._export_subdomains(
                target_id, workspace_path
            )
        
        if 'site_scan' in orchestrator.scan_types:
            # 导出端口文件
            data_files['ports_file'] = self._export_ports(
                target_id, workspace_path
            )
        
        if 'url_fetch' in orchestrator.scan_types or 'directory_scan' in orchestrator.scan_types:
            # 导出网站文件
            data_files['websites_file'] = self._export_websites(
                target_id, workspace_path
            )
        
        return data_files
    
    def _export_subdomains(self, target_id: int, workspace_path: Path) -> str:
        """导出子域名到文件"""
        from apps.asset.models import Subdomain
        
        output_file = workspace_path / 'subdomains.txt'
        subdomains = Subdomain.objects.filter(
            target_id=target_id
        ).values_list('name', flat=True)
        
        with open(output_file, 'w') as f:
            for subdomain in subdomains:
                f.write(f"{subdomain}\n")
        
        logger.info(f"导出 {len(subdomains)} 个子域名到 {output_file}")
        return str(output_file)
    
    def _export_ports(self, target_id: int, workspace_path: Path) -> str:
        """导出端口到文件（格式：subdomain:port）"""
        from apps.asset.models import Port
        
        output_file = workspace_path / 'ports.txt'
        ports = Port.objects.filter(
            target_id=target_id
        ).select_related('subdomain')
        
        with open(output_file, 'w') as f:
            for port in ports:
                f.write(f"{port.subdomain.name}:{port.port}\n")
        
        logger.info(f"导出 {ports.count()} 个端口到 {output_file}")
        return str(output_file)
    
    def _export_websites(self, target_id: int, workspace_path: Path) -> str:
        """导出网站 URL 到文件"""
        from apps.asset.models import WebSite
        
        output_file = workspace_path / 'websites.txt'
        websites = WebSite.objects.filter(
            target_id=target_id
        ).values_list('url', flat=True)
        
        with open(output_file, 'w') as f:
            for url in websites:
                f.write(f"{url}\n")
        
        logger.info(f"导出 {len(websites)} 个网站到 {output_file}")
        return str(output_file)
```

#### 2. initiate_scan_flow 只负责编排（完全无状态）

```python
@flow(name='initiate_scan')
def initiate_scan_flow(
    scan_id: int,
    scan_workspace_dir: str,
    engine_config: str,
    # 数据文件（根据配置可选）
    domain: str = None,
    subdomains_file: str = None,
    ports_file: str = None,
    websites_file: str = None
) -> dict:
    """
    初始化扫描任务（纯编排层，无数据库依赖）
    
    注意：
    - 所有数据文件都由 ScanService 准备好并传入
    - 本 Flow 不涉及任何数据库查询
    - 只负责调度子 Flow
    """
    
    # ==================== Step 1: 创建工作空间 ====================
    scan_workspace_path = create_scan_workspace_task(scan_workspace_dir)
    
    # ==================== Step 2: 解析配置 ====================
    orchestrator = FlowOrchestrator(engine_config)
    
    # ==================== Step 3: 执行 Flow（纯调度）====================
    results = {}
    
    for scan_type, flow_func in orchestrator.iter_flows():
        logger.info(f"执行 Flow: {scan_type}")
        
        # 根据 scan_type 调用不同的 flow，传递正确的参数
        if scan_type == 'subdomain_discovery':
            flow_result = flow_func(
                scan_id=scan_id,
                domain=domain,  # 直接使用传入的域名
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
        
        elif scan_type == 'port_scan':
            flow_result = flow_func(
                scan_id=scan_id,
                subdomains_file=subdomains_file,  # 直接使用传入的文件
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
        
        elif scan_type == 'site_scan':
            flow_result = flow_func(
                scan_id=scan_id,
                ports_file=ports_file,  # 直接使用传入的文件
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
        
        elif scan_type == 'url_fetch':
            flow_result = flow_func(
                scan_id=scan_id,
                websites_file=websites_file,  # 直接使用传入的文件
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
        
        elif scan_type == 'directory_scan':
            flow_result = flow_func(
                scan_id=scan_id,
                websites_file=websites_file,  # 直接使用传入的文件
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
        
        results[scan_type] = flow_result
    
    return {
        'success': True,
        'scan_id': scan_id,
        'results': results
    }
```

#### 2. Flow 只接收纯输入

**subdomain_discovery_flow:**
```python
@flow(name='subdomain_discovery')
def subdomain_discovery_flow(
    scan_id: int,
    domain: str,  # 直接接收域名字符串
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """子域名发现"""
    
    # 不需要查询数据库，直接使用 domain
    subdomains_dir = Path(scan_workspace_dir) / 'subdomain_discovery'
    
    # 解析配置
    enabled_tools = config_parser.parse_enabled_tools('subdomain_discovery', engine_config)
    
    # 执行扫描
    result_files = run_subdomain_tools(
        domain=domain,  # 使用传入的 domain
        tools=enabled_tools,
        output_dir=subdomains_dir
    )
    
    # 保存结果
    saved_count = save_subdomains(result_files, scan_id, target_id)
    
    return {'success': True, 'total': saved_count}
```

**port_scan_flow:**
```python
@flow(name='port_scan')
def port_scan_flow(
    scan_id: int,
    target_id: int,
    subdomains_file: str,  # 直接接收文件路径
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """端口扫描"""
    
    # 不需要导出子域名，直接使用 subdomains_file
    ports_dir = Path(scan_workspace_dir) / 'port_scan'
    
    # 解析配置
    enabled_tools = config_parser.parse_enabled_tools('port_scan', engine_config)
    
    # 执行扫描（直接使用传入的文件）
    result_files = run_port_scan_tools(
        subdomains_file=subdomains_file,  # 使用传入的文件
        tools=enabled_tools,
        output_dir=ports_dir
    )
    
    # 保存结果
    saved_count = save_ports(result_files, scan_id, target_id)
    
    return {'success': True, 'total': saved_count}
```

**site_scan_flow:**
```python
@flow(name='site_scan')
def site_scan_flow(
    scan_id: int,
    target_id: int,
    ports_file: str,  # 直接接收文件路径
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """站点扫描"""
    
    # 不需要导出端口，直接使用 ports_file
    site_scan_dir = Path(scan_workspace_dir) / 'site_scan'
    
    # 解析配置
    enabled_tools = config_parser.parse_enabled_tools('site_scan', engine_config)
    
    # 执行扫描（直接使用传入的文件）
    result_files = run_site_scan_tools(
        ports_file=ports_file,  # 使用传入的文件
        tools=enabled_tools,
        output_dir=site_scan_dir
    )
    
    # 保存结果
    saved_count = save_websites(result_files, scan_id, target_id)
    
    return {'success': True, 'total': saved_count}
```

**url_fetch_flow:**
```python
@flow(name='url_fetch')
def url_fetch_flow(
    scan_id: int,
    target_id: int,
    websites_file: str,  # 直接接收文件路径
    scan_workspace_dir: str,
    engine_config: str
) -> dict:
    """URL 获取"""
    
    # 不需要导出网站，直接使用 websites_file
    url_fetch_dir = Path(scan_workspace_dir) / 'url_fetch'
    
    # 解析配置
    enabled_tools = config_parser.parse_enabled_tools('url_fetch', engine_config)
    
    # 执行获取（直接使用传入的文件）
    result_files = run_url_fetch_tools(
        websites_file=websites_file,  # 使用传入的文件
        tools=enabled_tools,
        output_dir=url_fetch_dir
    )
    
    # 保存结果
    saved_count = save_urls(result_files, scan_id, target_id)
    
    return {'success': True, 'total': saved_count}
```

---

## 优势对比

| 维度 | 当前设计 | 改进后设计 |
|------|---------|-----------|
| **职责分离** | ❌ Flow 混合数据准备和执行 | ✅ **Service 准备数据，Flow 只编排** |
| **数据库依赖** | ❌ Flow 内部查询数据库 | ✅ **Flow 完全无数据库依赖** |
| **可测试性** | ❌ 难以独立测试 | ✅ **易于单元测试（Mock 文件路径）** |
| **参数语义** | ❌ target_id 不够清晰 | ✅ **subdomains_file 清晰明了** |
| **代码重用** | ❌ 导出逻辑分散 | ✅ **导出逻辑集中在 Service** |
| **灵活性** | ❌ 只能用数据库数据 | ✅ **可以用任何来源的数据** |
| **性能** | ❌ 每个 Flow 重复查询 | ✅ **Service 一次性准备所有数据** |
| **编排层纯度** | ❌ initiate_scan_flow 有业务逻辑 | ✅ **initiate_scan_flow 只做调度** |

### 关键改进点

1. **ScanService 承担数据准备职责**
   - ✅ 业务层处理业务逻辑（数据导出）
   - ✅ 可以访问数据库、缓存等资源
   - ✅ 易于单元测试（Mock Repository）

2. **Flow 层完全无状态**
   - ✅ 不查询数据库
   - ✅ 不访问外部服务
   - ✅ 只接收数据，做编排
   - ✅ 可以独立测试（Mock 文件）

3. **参数传递语义化**
   - ✅ `domain`: 明确是域名字符串
   - ✅ `subdomains_file`: 明确是子域名文件路径
   - ✅ `ports_file`: 明确是端口文件路径
   - ✅ `websites_file`: 明确是网站文件路径

4. **遵循SOLID原则**
   - ✅ **单一职责**：Service 负责数据，Flow 负责编排
   - ✅ **开闭原则**：添加新的数据源无需修改 Flow
   - ✅ **依赖倒置**：Flow 依赖抽象（文件路径），不依赖具体（数据库）

---

## 实施步骤

### 阶段 1：在 ScanService 中添加数据准备方法 ⭐

```python
# apps/scan/services/scan_service.py

class ScanService:
    """核心改动：在 Service 层添加数据准备方法"""
    
    def _prepare_scan_data(self, target_id, workspace_dir, engine_config) -> dict:
        """准备扫描数据文件（见上面完整示例）"""
        pass
    
    def _export_subdomains(self, target_id, workspace_path) -> str:
        """导出子域名文件"""
        pass
    
    def _export_ports(self, target_id, workspace_path) -> str:
        """导出端口文件"""
        pass
    
    def _export_websites(self, target_id, workspace_path) -> str:
        """导出网站文件"""
        pass
```

**为什么在 Service 而不是 Task？**
- ✅ Service 负责业务逻辑，数据导出是业务逻辑的一部分
- ✅ 在提交 Flow 之前完成数据准备，保证数据就绪
- ✅ 易于事务管理和错误处理
- ❌ Task 在 Flow 内部执行，会导致 Flow 与数据库耦合

### 阶段 2：修改 ScanService.initiate_scan()

```python
# 修改前
flow_kwargs = {
    'scan_id': scan.id,
    'target_name': scan.target.name,
    'target_id': scan.target.id,  # ❌ 传递 ID
    'scan_workspace_dir': scan.results_dir,
    'engine_name': scan.engine.name,
    'engine_config': scan.engine.configuration
}

# 修改后
data_files = self._prepare_scan_data(
    target_id=scan.target.id,
    workspace_dir=scan.results_dir,
    engine_config=scan.engine.configuration
)

flow_kwargs = {
    'scan_id': scan.id,
    'scan_workspace_dir': scan.results_dir,
    'engine_config': scan.engine.configuration,
    **data_files  # ✅ 传递文件路径
}
```

### 阶段 3：重构 initiate_scan_flow

```python
# 修改前
def initiate_scan_flow(
    scan_id, target_name, target_id, scan_workspace_dir, engine_config
):
    # ...

# 修改后
def initiate_scan_flow(
    scan_id,
    scan_workspace_dir,
    engine_config,
    # 数据文件（可选）
    domain=None,
    subdomains_file=None,
    ports_file=None,
    websites_file=None
):
    # 不再查询数据库，直接使用传入的文件
    # ...
```

### 阶段 4：重构各个子 Flow

**subdomain_discovery_flow:**
```python
# 修改前
def subdomain_discovery_flow(scan_id, target_name, target_id, ...):
    # 直接使用 target_name

# 修改后
def subdomain_discovery_flow(scan_id, domain, ...):
    # 使用传入的 domain，更语义化
```

**port_scan_flow:**
```python
# 修改前
def port_scan_flow(scan_id, target_id, ...):
    # 内部导出子域名
    subdomains_file = export_subdomains_task(target_id, ...)

# 修改后
def port_scan_flow(scan_id, subdomains_file, ...):
    # 直接使用传入的 subdomains_file
```

**其他 Flow 类似修改...**

### 阶段 5：测试验证

**单元测试示例：**
```python
def test_port_scan_flow():
    """测试端口扫描 Flow（无需数据库）"""
    # 创建测试文件
    test_file = '/tmp/test_subdomains.txt'
    with open(test_file, 'w') as f:
        f.write("example.com\n")
        f.write("www.example.com\n")
    
    # 测试 Flow（只需 Mock 文件）
    result = port_scan_flow(
        scan_id=1,
        subdomains_file=test_file,
        scan_workspace_dir='/tmp/test',
        engine_config='...'
    )
    
    assert result['success'] == True
    # 清理
    os.remove(test_file)
```

**集成测试：**
- 验证 ScanService.initiate_scan() 正确准备数据文件
- 验证 Flow 正确接收和使用数据文件
- 验证整个扫描流程端到端运行

---

## 后续优化空间

### 1. 使用上下文对象

如果参数太多，可以使用上下文对象：

```python
@dataclass
class ScanContext:
    """扫描上下文"""
    scan_id: int
    target_id: int
    scan_workspace_dir: str
    engine_config: str
    
    # 数据文件
    domain: Optional[str] = None
    subdomains_file: Optional[str] = None
    ports_file: Optional[str] = None
    websites_file: Optional[str] = None

# 使用
def port_scan_flow(ctx: ScanContext) -> dict:
    # 直接使用 ctx.subdomains_file
    pass
```

### 2. 流式数据传递

如果数据量大，可以考虑流式处理，而不是一次性导出所有数据。

### 3. 缓存机制

对于经常使用的数据文件，可以添加缓存机制，避免重复导出。

---

## 总结

### 核心思想 ⭐

**三层分离，各司其职：**
1. **ScanService（业务层）**：准备数据（What to do）
2. **initiate_scan_flow（编排层）**：调度子 Flow（When to do）
3. **子 Flow（执行层）**：执行扫描（How to do）

### 架构原则

```
┌─────────────────────────────────────────────────────────┐
│  原则 1：数据准备与执行分离                               │
│  - ScanService 负责数据库查询和文件导出                   │
│  - Flow 负责编排和调用，不涉及数据库                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  原则 2：Flow 完全无状态                                  │
│  - 只接收纯输入（文件路径、字符串）                       │
│  - 不依赖任何外部服务（数据库、API等）                    │
│  - 可独立测试，易于调试                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  原则 3：参数语义化                                       │
│  - 参数名明确表达数据类型                                 │
│  - domain（域名）vs subdomains_file（文件）               │
│  - 避免传递 ID，让接收方自己查询                          │
└─────────────────────────────────────────────────────────┘
```

### 关键好处

1. ✅ **职责清晰** - Service 做业务，Flow 做编排，Task 做执行
2. ✅ **易于测试** - Flow 无数据库依赖，可独立单元测试
3. ✅ **灵活扩展** - 支持多种数据源（数据库、文件、API等）
4. ✅ **性能优化** - Service 一次性准备数据，避免重复查询
5. ✅ **代码清晰** - 参数语义化，一看就懂需要什么
6. ✅ **符合SOLID** - 单一职责、开闭原则、依赖倒置

### 实施代价

**需要修改的内容：**
- ⚠️ ScanService 增加数据准备方法（~50行代码）
- ⚠️ initiate_scan_flow 修改参数签名
- ⚠️ 各个子 Flow 修改参数签名

**收益远大于成本：**
- ✅ 长期维护成本降低
- ✅ 代码质量提升
- ✅ 可测试性大幅提高
- ✅ 架构更加清晰

### 最终评价

改进后的设计完全符合：
- ✅ **单一职责原则（SRP）**：每层只做一件事
- ✅ **开闭原则（OCP）**：对扩展开放，对修改关闭
- ✅ **依赖倒置原则（DIP）**：依赖抽象（文件路径），不依赖具体（数据库）
- ✅ **领域驱动设计（DDD）**：业务逻辑在 Service，编排在 Flow

**这是更加专业、可维护、可测试的架构设计！** 🎯
