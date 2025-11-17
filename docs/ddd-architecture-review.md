# DDD 架构审查报告

> 审查时间：2025-11-17  
> 审查范围：backend/apps/ 所有模块  
> 审查标准：DDD（领域驱动设计）+ Clean Architecture

---

## 📋 执行摘要

### ✅ 已完成的架构改进
- **Scan 模块**：完整的分层架构（Repository → Service → Views）
- **Targets 模块**：完整的分层架构（Repository → Service → Tasks → Views）
- **Engine 模块**：Repository 层已创建

### ❌ 发现的主要问题
1. **Views 层直接操作 ORM**（严重违反 DDD）
2. **Asset 模块缺少 Service 层**
3. **Handlers 层直接操作 Models**
4. **跨层调用混乱**

---

## 🔴 严重问题（Priority: High）

### 1. Views 层直接使用 ORM 查询

**违反原则**：Views 层应该只处理 HTTP 请求/响应，不应直接操作数据库

#### 问题文件清单

| 文件 | 问题数 | 问题描述 |
|------|--------|----------|
| `apps/targets/views.py` | 9 | 直接使用 `Organization.objects`、`Target.objects`、`Subdomain.objects` |
| `apps/asset/views.py` | 8 | 直接使用 `IPAddress.objects`、`Subdomain.objects`、`WebSite.objects`、`Directory.objects` |
| `apps/engine/views.py` | 1 | 直接使用 `ScanEngine.objects` |
| `apps/scan/notifications/views.py` | 3 | 直接使用 `Notification.objects` |

#### 典型违规代码

```python
# ❌ 错误：Views 层直接使用 ORM
class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()  # 违反 DDD
    
    def get_queryset(self):
        return Organization.objects.annotate(  # 违反 DDD
            target_count=Count('targets')
        )

# ❌ 错误：Views 层直接执行删除
@action(detail=False, methods=['post', 'delete'], url_path='bulk-delete')
def bulk_delete(self, request):
    deleted_count, _ = IPAddress.objects.filter(id__in=ids).delete()  # 违反 DDD
```

#### ✅ 正确做法

```python
# ✅ 正确：Views → Service → Repository → Models
class OrganizationViewSet(viewsets.ModelViewSet):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = OrganizationService()
    
    def get_queryset(self):
        return self.service.get_all_with_stats()  # 通过 Service 层
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        self.service.bulk_delete(ids)  # 通过 Service 层
        return Response(status=202)
```

---

### 2. Handlers 层直接操作 Models

**违反原则**：Handlers 应该通过 Service/Repository 层操作数据

#### 问题文件：`apps/scan/handlers/initiate_scan_flow_handlers.py`

```python
# ❌ 错误：直接使用 Scan.objects
cancelled_updated = Scan.objects.filter(
    id=scan_id,
    status=ScanStatus.CANCELLING
).update(
    status=ScanStatus.CANCELLED,
    stopped_at=timezone.now()
)
```

#### ✅ 正确做法

```python
# ✅ 方案 1：通过 Repository 层
from apps.scan.repositories import DjangoScanRepository

repo = DjangoScanRepository()
success = repo.update_status_if_match(
    scan_id=scan_id,
    current_status=ScanStatus.CANCELLING,
    new_status=ScanStatus.CANCELLED
)

# ✅ 方案 2：通过 Service 层
from apps.scan.services import ScanService

service = ScanService()
success = service.complete_cancellation(scan_id)
```

---

## 🟡 中等问题（Priority: Medium）

### 3. Asset 模块缺少 Service 层

**问题**：Asset 模块只有 Views 和 Repository，缺少 Service 层

#### 当前架构
```
apps/asset/
├── repositories/     ✅ 已有
│   ├── subdomain_repository.py
│   ├── website_repository.py
│   ├── directory_repository.py
│   └── ...
├── views.py          ✅ 已有（但直接调用 ORM）
└── services/         ❌ 缺失
```

#### 需要创建的 Service 层

```python
# apps/asset/services/subdomain_service.py
class SubdomainService:
    def __init__(self, repository=None):
        self.repo = repository or DjangoSubdomainRepository()
    
    def bulk_delete(self, subdomain_ids: List[int]) -> Tuple[int, str]:
        """批量删除子域名"""
        # 业务逻辑：验证、权限检查、日志记录
        deleted_count, _ = self.repo.bulk_delete_by_ids(subdomain_ids)
        return deleted_count, f"已删除 {deleted_count} 个子域名"
    
    def get_list(self, filters: dict) -> QuerySet:
        """获取子域名列表（带过滤）"""
        return self.repo.get_filtered_list(filters)
```

---

### 4. Common 模块缺少分层架构

**问题**：Common 模块（通知系统）缺少完整的分层

#### 当前架构
```
apps/common/
├── models.py         ✅ Notification 模型
├── views.py          ❌ 直接使用 ORM
├── services.py       ⚠️  只有 create_notification 函数
├── repositories/     ❌ 缺失
└── tasks/           ❌ 缺失
```

#### 建议架构
```
apps/common/
├── models.py
├── repositories/
│   ├── notification_repository.py
│   └── django_notification_repository.py
├── services/
│   └── notification_service.py
├── tasks/
│   └── notification_tasks.py  # SSE 推送任务
└── views.py
```

---

## 🟢 轻微问题（Priority: Low）

### 5. 部分模块缺少 Protocol 接口

**问题**：Targets 和 Asset 模块的 Repository 缺少 Protocol 接口

#### 当前状态
- ✅ Scan: 有 `ScanRepositoryInterface` (Protocol)
- ✅ Engine: 有 `EngineRepositoryInterface` (Protocol)
- ❌ Targets: 缺少 Protocol 接口
- ❌ Asset: 缺少 Protocol 接口

#### 建议补充

```python
# apps/targets/repositories/target_repository.py
from typing import Protocol, List, TYPE_CHECKING

if TYPE_CHECKING:
    from ..models import Target

class TargetRepositoryInterface(Protocol):
    """Target 数据访问层抽象接口"""
    
    def get_by_id(self, target_id: int) -> Target | None: ...
    def bulk_delete_by_ids(self, target_ids: List[int]) -> Tuple[int, dict]: ...
```

---

## 📊 架构评分卡

| 模块 | Repository | Service | Tasks | Views | 总分 |
|------|-----------|---------|-------|-------|------|
| **Scan** | ✅ 100% | ✅ 100% | ✅ 90% | ✅ 95% | **96%** |
| **Targets** | ✅ 90% | ✅ 100% | ✅ 100% | ❌ 30% | **80%** |
| **Engine** | ✅ 80% | ❌ 0% | - | ❌ 20% | **33%** |
| **Asset** | ✅ 95% | ❌ 0% | - | ❌ 20% | **38%** |
| **Common** | ❌ 0% | ⚠️ 40% | ❌ 0% | ❌ 30% | **23%** |

**整体评分：54% / 100%**

---

## 🎯 修复优先级路线图

### Phase 1: 紧急修复（本周）

#### 1.1 修复 Views 层直接操作 ORM
- [ ] `apps/asset/views.py` - 创建 Service 层并重构
- [ ] `apps/targets/views.py` - 重构批量操作方法
- [ ] `apps/engine/views.py` - 添加 Service 层

#### 1.2 修复 Handlers 层
- [ ] `apps/scan/handlers/initiate_scan_flow_handlers.py` - 使用 Repository 层

### Phase 2: 架构完善（下周）

#### 2.1 创建缺失的 Service 层
- [ ] `apps/asset/services/`
  - [ ] `subdomain_service.py`
  - [ ] `website_service.py`
  - [ ] `directory_service.py`
  - [ ] `ip_address_service.py`
- [ ] `apps/engine/services/`
  - [ ] `engine_service.py`

#### 2.2 完善 Repository 层
- [ ] 添加 Protocol 接口
- [ ] 补充缺失的 Repository 方法

### Phase 3: 优化提升（两周后）

#### 3.1 通知系统重构
- [ ] 创建 `apps/common/repositories/`
- [ ] 重构 `notification_service.py`
- [ ] 创建 `notification_tasks.py`

#### 3.2 补充单元测试
- [ ] Repository 层测试
- [ ] Service 层测试
- [ ] Integration 测试

---

## 📐 DDD 架构最佳实践

### 标准调用链

```
┌─────────────────────────────────────────────────────────────┐
│                     HTTP Request (前端)                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Views (HTTP 层)                                             │
│  ✅ 参数验证、权限检查                                        │
│  ✅ 调用 Service 层                                          │
│  ❌ 禁止直接操作 Models/ORM                                   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Service (业务逻辑层)                                         │
│  ✅ 业务逻辑、数据验证                                        │
│  ✅ 调用 Repository 层                                       │
│  ✅ 事务管理                                                 │
│  ❌ 禁止直接操作 Models                                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Repository (数据访问层)                                      │
│  ✅ ORM 查询、数据访问                                        │
│  ✅ 批量操作                                                 │
│  ❌ 禁止业务逻辑                                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Models (数据模型层)                                          │
│  ✅ ORM 定义、数据结构                                        │
│  ❌ 禁止业务逻辑、查询逻辑                                    │
└─────────────────────────────────────────────────────────────┘
```

### 禁止的操作

| 层级 | ❌ 禁止操作 |
|------|------------|
| **Views** | 直接使用 `.objects`、直接调用 `.save()`、直接调用 `.delete()` |
| **Service** | 直接写 SQL、直接操作 HTTP 请求对象 |
| **Repository** | 包含业务逻辑、发送通知、记录复杂日志 |
| **Models** | 复杂查询方法、业务逻辑方法 |

---

## 🛠️ 重构示例

### 示例 1: SubdomainViewSet 重构

#### Before (❌ 违反 DDD)
```python
class SubdomainViewSet(viewsets.ModelViewSet):
    queryset = Subdomain.objects.all()  # 违反
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        deleted_count, _ = Subdomain.objects.filter(id__in=ids).delete()  # 违反
        return Response({'message': f'删除成功'})
```

#### After (✅ 符合 DDD)
```python
# views.py
class SubdomainViewSet(viewsets.ModelViewSet):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainService()
    
    def get_queryset(self):
        return self.service.get_all()  # 通过 Service
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        
        # 调用 Service 层（异步）
        async_bulk_delete_subdomains(ids)
        
        return Response(status=202)

# services/subdomain_service.py
class SubdomainService:
    def __init__(self):
        self.repo = DjangoSubdomainRepository()
    
    def bulk_delete(self, subdomain_ids: List[int]) -> int:
        """批量删除子域名"""
        logger.info("开始批量删除子域名 - IDs: %s", subdomain_ids)
        deleted_count, _ = self.repo.bulk_delete_by_ids(subdomain_ids)
        logger.info("批量删除子域名成功 - 删除数量: %d", deleted_count)
        return deleted_count

# repositories/django_subdomain_repository.py
class DjangoSubdomainRepository:
    @staticmethod
    def bulk_delete_by_ids(subdomain_ids: List[int]) -> Tuple[int, dict]:
        """批量删除子域名"""
        return Subdomain.objects.filter(id__in=subdomain_ids).delete()

# tasks/subdomain_tasks.py
def async_bulk_delete_subdomains(subdomain_ids: List[int]):
    def _delete():
        service = SubdomainService()
        deleted_count = service.bulk_delete(subdomain_ids)
        create_notification(f"删除成功 {deleted_count} 个子域名")
    
    threading.Thread(target=_delete).start()
```

---

## 📝 检查清单

在提交代码前，请确认：

- [ ] Views 层没有使用 `.objects`
- [ ] Views 层没有调用 `.save()` 或 `.delete()`
- [ ] Service 层包含所有业务逻辑
- [ ] Repository 层只做数据访问
- [ ] Models 层只定义数据结构
- [ ] 所有跨层调用符合：Views → Service → Repository → Models
- [ ] 依赖注入已正确实现
- [ ] 已添加适当的日志记录
- [ ] 已添加异常处理

---

## 📚 参考资料

- [DDD 领域驱动设计](https://www.domainlanguage.com/ddd/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Django Service Layer Pattern](https://mitchel.me/2017/django-service-objects/)
- 项目内部文档：`/docs/code-review/codelayering.md`

---

## 📊 总结

### 当前状态
- ✅ **Scan 模块架构优秀**：完整的分层，符合 DDD
- ⚠️ **Targets 模块部分合规**：Service 层完善，但 Views 层有问题
- ❌ **Asset 模块需要重构**：缺少 Service 层
- ❌ **Engine 模块需要重构**：缺少 Service 层
- ❌ **Common 模块需要重构**：缺少完整分层

### 下一步行动
1. **立即修复**：Views 层直接操作 ORM（最严重）
2. **本周完成**：创建缺失的 Service 层
3. **两周完成**：完善 Repository Protocol 接口
4. **一个月完成**：补充单元测试和集成测试

**目标：整体架构评分提升至 90% 以上**
