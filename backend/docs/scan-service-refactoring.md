# ScanService 解耦重构方案

## 当前问题

**ScanService 过于庞大（845 行）**，承担了太多职责：

1. ✅ 扫描任务创建和提交
2. ✅ 扫描状态管理
3. ✅ 扫描统计数据更新
4. ✅ 扫描任务删除
5. ✅ 扫描任务停止
6. ✅ 统计数据查询
7. ⚠️ **未来还要添加：数据导出逻辑（准备扫描数据文件）**

**违反了单一职责原则（SRP）**

---

## 解耦方案：按职责拆分成多个 Service

### 方案 1：按功能领域拆分（推荐）⭐

```
apps/scan/services/
├── __init__.py                    # 统一导出
├── scan_service.py                # 核心服务（协调者）
├── scan_creation_service.py       # 扫描创建服务
├── scan_state_service.py          # 状态管理服务
├── scan_control_service.py        # 控制服务（停止、取消）
├── scan_stats_service.py          # 统计服务
└── scan_data_service.py           # 数据准备服务（新增）⭐
```

### 各 Service 职责划分

#### 1. ScanService（核心服务，100-150行）
**职责**：协调其他服务，提供统一入口

```python
class ScanService:
    """
    扫描服务（协调者）
    
    职责：
    - 协调各个子服务
    - 提供统一的公共接口
    - 不包含具体业务逻辑
    """
    
    def __init__(self):
        self.creation_service = ScanCreationService()
        self.state_service = ScanStateService()
        self.control_service = ScanControlService()
        self.stats_service = ScanStatsService()
        self.data_service = ScanDataService()
        
        # 仓储层
        self.scan_repo = DjangoScanRepository()
    
    # ==================== 委托给子服务 ====================
    
    def initiate_scan(self, targets, engine_id):
        """创建并启动扫描（委托给 ScanCreationService）"""
        return self.creation_service.initiate_scan(targets, engine_id)
    
    def update_status(self, scan_id, status):
        """更新状态（委托给 ScanStateService）"""
        return self.state_service.update_status(scan_id, status)
    
    def stop_scan(self, scan_id):
        """停止扫描（委托给 ScanControlService）"""
        return self.control_service.stop_scan(scan_id)
    
    def get_statistics(self):
        """获取统计（委托给 ScanStatsService）"""
        return self.stats_service.get_statistics()
    
    def prepare_scan_data(self, target_id, workspace_dir, engine_config):
        """准备扫描数据（委托给 ScanDataService）"""
        return self.data_service.prepare_scan_data(
            target_id, workspace_dir, engine_config
        )
    
    # ==================== 一些简单的查询方法可以保留 ====================
    
    def get_scan(self, scan_id, prefetch_relations=False):
        """获取扫描任务"""
        return self.scan_repo.get_by_id(scan_id, prefetch_relations)
```

#### 2. ScanCreationService（扫描创建服务，200-250行）
**职责**：创建和提交扫描任务

```python
class ScanCreationService:
    """
    扫描创建服务
    
    职责：
    - 准备扫描参数
    - 创建 Scan 记录
    - 提交 Prefect Flow Run
    - 处理创建过程中的错误
    """
    
    def __init__(self):
        self.scan_repo = DjangoScanRepository()
        self.target_repo = DjangoTargetRepository()
        self.engine_repo = DjangoEngineRepository()
        self.data_service = ScanDataService()  # 依赖数据服务
    
    def prepare_initiate_scan(self, organization_id, target_id, engine_id):
        """准备扫描参数（验证、查询）"""
        pass
    
    def create_scans(self, targets, engine):
        """批量创建 Scan 记录"""
        pass
    
    def initiate_scan(self, targets, engine_id):
        """
        创建并启动扫描
        
        流程：
        1. 准备参数（prepare_initiate_scan）
        2. 创建 Scan 记录（create_scans）
        3. 准备数据文件（data_service.prepare_scan_data）⭐
        4. 提交 Flow Run
        """
        pass
    
    def _submit_flow_run(self, scan, engine):
        """提交单个扫描的 Flow Run"""
        # 1. 准备数据文件
        data_files = self.data_service.prepare_scan_data(
            target_id=scan.target.id,
            workspace_dir=scan.results_dir,
            engine_config=engine.configuration
        )
        
        # 2. 准备 Flow 参数
        flow_kwargs = {
            'scan_id': scan.id,
            'scan_workspace_dir': scan.results_dir,
            'engine_config': engine.configuration,
            **data_files  # 展开数据文件
        }
        
        # 3. 提交 Flow Run
        flow_run_id = _submit_flow_deployment(
            deployment_name="initiate_scan/initiate-scan-on-demand",
            parameters=flow_kwargs
        )
        
        return flow_run_id
    
    def _generate_scan_workspace_dir(self):
        """生成工作空间目录"""
        pass
```

#### 3. ScanStateService（状态管理服务，150-200行）
**职责**：管理扫描状态和缓存统计

```python
class ScanStateService:
    """
    扫描状态管理服务
    
    职责：
    - 更新扫描状态
    - 条件状态更新（乐观锁）
    - 更新缓存统计数据
    - 状态验证
    """
    
    def __init__(self):
        self.scan_repo = DjangoScanRepository()
    
    def update_status(self, scan_id, status, error_message=None, stopped_at=None):
        """更新扫描状态"""
        pass
    
    def update_status_if_match(self, scan_id, current_status, new_status):
        """条件更新状态（乐观锁）"""
        pass
    
    def update_cached_stats(self, scan_id):
        """更新缓存统计数据"""
        pass
    
    def validate_status_transition(self, current_status, new_status):
        """验证状态转换是否合法"""
        pass
```

#### 4. ScanControlService（控制服务，150-200行）
**职责**：停止、取消、删除扫描

```python
class ScanControlService:
    """
    扫描控制服务
    
    职责：
    - 停止扫描（取消 Flow Run）
    - 删除扫描（两阶段删除）
    - 批量操作
    """
    
    def __init__(self):
        self.scan_repo = DjangoScanRepository()
        self.state_service = ScanStateService()
    
    def stop_scan(self, scan_id):
        """
        停止扫描
        
        流程：
        1. 取消所有 Flow Run
        2. 更新状态为 CANCELLED
        3. 返回取消数量
        """
        pass
    
    def delete_scans_two_phase(self, scan_ids):
        """
        两阶段删除
        
        流程：
        1. 软删除（标记 deleted_at）
        2. 提交硬删除 Flow Run
        """
        pass
    
    def bulk_delete(self, scan_ids):
        """批量删除（兼容旧接口）"""
        pass
    
    async def _cancel_flow_runs(self, flow_run_ids):
        """取消 Prefect Flow Run"""
        pass
```

#### 5. ScanStatsService（统计服务，80-100行）
**职责**：统计数据查询和聚合

```python
class ScanStatsService:
    """
    扫描统计服务
    
    职责：
    - 统计数据查询
    - 数据聚合
    - 报表生成
    """
    
    def __init__(self):
        self.scan_repo = DjangoScanRepository()
    
    def get_statistics(self):
        """
        获取扫描统计数据
        
        返回：
        - 总扫描数
        - 各状态数量
        - 成功率
        - 平均耗时
        """
        pass
    
    def get_scan_summary(self, scan_id):
        """获取单个扫描的摘要统计"""
        pass
    
    def get_target_statistics(self, target_id):
        """获取目标的扫描统计"""
        pass
```

#### 6. ScanDataService（数据准备服务，150-200行）⭐ 新增
**职责**：准备扫描所需的数据文件

```python
class ScanDataService:
    """
    扫描数据准备服务
    
    职责：
    - 导出子域名文件
    - 导出端口文件
    - 导出网站文件
    - 根据引擎配置准备对应数据
    
    这是为了解决 Flow 数据库耦合问题新增的服务
    """
    
    def __init__(self):
        self.target_repo = DjangoTargetRepository()
    
    def prepare_scan_data(
        self,
        target_id: int,
        workspace_dir: str,
        engine_config: str
    ) -> dict:
        """
        准备扫描所需的数据文件
        
        根据 engine_config 中的配置，导出相应的数据文件
        
        Returns:
            dict: {
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
        target = self.target_repo.get_by_id(target_id)
        data_files['domain'] = target.name
        
        # 根据配置导出数据文件
        if 'port_scan' in orchestrator.scan_types:
            data_files['subdomains_file'] = self._export_subdomains(
                target_id, workspace_path
            )
        
        if 'site_scan' in orchestrator.scan_types:
            data_files['ports_file'] = self._export_ports(
                target_id, workspace_path
            )
        
        if 'url_fetch' in orchestrator.scan_types or 'directory_scan' in orchestrator.scan_types:
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
        """导出端口到文件"""
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

---

## 优势对比

| 维度 | 当前设计 | 解耦后设计 |
|------|---------|-----------|
| **文件大小** | 845 行 | 每个 Service 150-250 行 |
| **职责清晰** | ❌ 混乱 | ✅ 单一职责 |
| **可测试性** | ❌ 难以测试 | ✅ 易于单元测试 |
| **可维护性** | ❌ 难以定位问题 | ✅ 问题定位清晰 |
| **团队协作** | ❌ 容易冲突 | ✅ 独立开发 |
| **代码复用** | ❌ 低 | ✅ 高 |

---

## 实施步骤

### 阶段 1：创建新的 Service 文件

```bash
# 创建新的 Service 文件
touch apps/scan/services/scan_creation_service.py
touch apps/scan/services/scan_state_service.py
touch apps/scan/services/scan_control_service.py
touch apps/scan/services/scan_stats_service.py
touch apps/scan/services/scan_data_service.py
```

### 阶段 2：逐个迁移功能

**步骤：**
1. 先实现 `ScanDataService`（新增功能，无依赖）
2. 再实现 `ScanStatsService`（简单，依赖少）
3. 然后实现 `ScanStateService`（中等复杂度）
4. 接着实现 `ScanControlService`（依赖 StateService）
5. 最后实现 `ScanCreationService`（最复杂，依赖 DataService）
6. 重构 `ScanService` 为协调者

### 阶段 3：更新 __init__.py

```python
# apps/scan/services/__init__.py

from .scan_service import ScanService
from .scan_creation_service import ScanCreationService
from .scan_state_service import ScanStateService
from .scan_control_service import ScanControlService
from .scan_stats_service import ScanStatsService
from .scan_data_service import ScanDataService

__all__ = [
    'ScanService',           # 主入口（向后兼容）
    'ScanCreationService',
    'ScanStateService',
    'ScanControlService',
    'ScanStatsService',
    'ScanDataService',
]
```

### 阶段 4：向后兼容

**保持 Views 层代码不变：**
```python
# apps/scan/views.py

from apps.scan.services import ScanService

class ScanViewSet(viewsets.ModelViewSet):
    def create(self, request):
        service = ScanService()  # 统一入口
        scans = service.initiate_scan(...)  # 内部委托给子服务
        # ...
```

---

## 依赖关系图

```
┌─────────────────────────────────────────────────────────┐
│  ScanService (协调者)                                     │
│  - 提供统一入口                                            │
│  - 委托给子服务                                            │
└───────────┬─────────────────────────────────────────────┘
            │
            ├─────> ScanCreationService
            │       └──> ScanDataService ⭐
            │
            ├─────> ScanStateService
            │
            ├─────> ScanControlService
            │       └──> ScanStateService
            │
            └─────> ScanStatsService
```

---

## 代码量估算

| Service | 行数 | 复杂度 | 依赖 |
|---------|------|--------|------|
| ScanService | 100-150 | 低 | 协调各服务 |
| ScanCreationService | 200-250 | 高 | DataService |
| ScanStateService | 150-200 | 中 | Repository |
| ScanControlService | 150-200 | 中 | StateService |
| ScanStatsService | 80-100 | 低 | Repository |
| ScanDataService | 150-200 | 中 | TargetRepo |
| **总计** | **830-1100** | - | - |

**注意**：
- 总行数略有增加（增加了注释和文档）
- 但每个文件都更易理解和维护
- 符合 **单一职责原则**

---

## 最佳实践

### 1. 命名规范
- Service 类：`XxxService`
- 文件名：`xxx_service.py`（snake_case）

### 2. 依赖注入
```python
class ScanCreationService:
    def __init__(
        self,
        scan_repo=None,
        data_service=None
    ):
        self.scan_repo = scan_repo or DjangoScanRepository()
        self.data_service = data_service or ScanDataService()
```

### 3. 单一职责
- 每个 Service 只负责一个领域
- 避免相互调用（除了协调者 ScanService）

### 4. 接口抽象
```python
# 可选：定义接口（Protocol）
from typing import Protocol

class ScanDataServiceProtocol(Protocol):
    def prepare_scan_data(self, target_id, workspace_dir, engine_config) -> dict:
        ...
```

---

## 总结

### 核心收益

1. ✅ **职责清晰** - 每个 Service 只做一件事
2. ✅ **易于测试** - 可以单独测试每个 Service
3. ✅ **易于维护** - 问题定位更快
4. ✅ **易于扩展** - 添加新功能不影响其他 Service
5. ✅ **团队协作** - 不同开发者可以独立工作
6. ✅ **向后兼容** - Views 层代码无需修改

### 实施建议

**推荐分阶段实施：**
1. **第一期**（解决当前 Flow 耦合问题）：
   - 添加 `ScanDataService`
   - 修改 `ScanCreationService` 使用 `ScanDataService`

2. **第二期**（全面解耦）：
   - 拆分其他 Service
   - 重构 `ScanService` 为协调者

3. **第三期**（优化提升）：
   - 添加单元测试
   - 性能优化
   - 完善文档

**这样可以逐步重构，降低风险！** 🎯
