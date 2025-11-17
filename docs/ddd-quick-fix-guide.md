# DDD 架构快速修复指南

> 这是 `ddd-architecture-review.md` 的快速执行版本  
> 按优先级排序，立即可执行

---

## 🔴 必须立即修复（Critical）

### 1. apps/asset/views.py - 创建 Service 层

#### 问题代码
```python
# ❌ 当前代码（违反 DDD）
class SubdomainViewSet(viewsets.ModelViewSet):
    queryset = Subdomain.objects.all()  # 直接使用 ORM
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        deleted_count, _ = Subdomain.objects.filter(id__in=ids).delete()  # 直接删除
        return Response({'message': '删除成功'})
```

#### 修复步骤

**Step 1**: 创建 Service 层
```bash
mkdir -p backend/apps/asset/services
```

**Step 2**: 创建 `apps/asset/services/subdomain_service.py`
```python
import logging

from apps.asset.repositories import DjangoSubdomainRepository

logger = logging.getLogger(__name__)

class SubdomainService:
    def __init__(self):
        self.repo = DjangoSubdomainRepository()
    
    def bulk_delete(self, subdomain_ids: list[int]) -> tuple[int, str]:
        """批量删除子域名"""
        logger.info("批量删除子域名 - IDs: %s", subdomain_ids)
        deleted_count, _ = self.repo.bulk_delete_by_ids(subdomain_ids)
        return deleted_count, f"已删除 {deleted_count} 个子域名"
```

**Step 3**: 在 Repository 添加方法（如果不存在）
```python
# apps/asset/repositories/django_subdomain_repository.py
def bulk_delete_by_ids(self, subdomain_ids: list[int]) -> tuple[int, dict]:
    """批量删除子域名"""
    return Subdomain.objects.filter(id__in=subdomain_ids).delete()
```

**Step 4**: 修改 Views
```python
# apps/asset/views.py
from apps.asset.services.subdomain_service import SubdomainService

class SubdomainViewSet(viewsets.ModelViewSet):
    serializer_class = SubdomainListSerializer
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubdomainService()
    
    def get_queryset(self):
        return self.service.get_all()  # 通过 Service
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        deleted_count, message = self.service.bulk_delete(ids)
        return Response({'message': message}, status=200)
```

**同样的方法应用到**：
- `WebSiteViewSet`
- `DirectoryViewSet`
- `IPAddressViewSet`

---

### 2. apps/targets/views.py - 重构批量操作

#### 需要修复的方法

```python
# ❌ 错误
@action(detail=False, methods=['post'])
def batch_create(self, request):
    # ... 省略 ...
    target, created = Target.objects.get_or_create(...)  # 直接使用 ORM
    Subdomain.objects.get_or_create(...)  # 直接使用 ORM
```

#### ✅ 修复
```python
# apps/targets/services/target_service.py
class TargetService:
    def batch_create(self, targets_data: list[dict], organization_id: int = None):
        """批量创建目标"""
        # 业务逻辑
        for data in targets_data:
            target = self.repo.get_or_create(
                name=data['name'],
                type=data['type']
            )
            # ...

# apps/targets/views.py
class TargetViewSet(viewsets.ModelViewSet):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = TargetService()
    
    @action(detail=False, methods=['post'])
    def batch_create(self, request):
        targets_data = request.data.get('targets', [])
        organization_id = request.data.get('organization_id')
        
        result = self.service.batch_create(targets_data, organization_id)
        return Response(result)
```

---

### 3. apps/scan/handlers/ - 使用 Repository 层

#### 问题代码
```python
# ❌ apps/scan/handlers/initiate_scan_flow_handlers.py
cancelled_updated = Scan.objects.filter(
    id=scan_id,
    status=ScanStatus.CANCELLING
).update(
    status=ScanStatus.CANCELLED,
    stopped_at=timezone.now()
)
```

#### ✅ 修复方案 1：在 Repository 添加方法
```python
# apps/scan/repositories/django_scan_repository.py
class DjangoScanRepository:
    @staticmethod
    def update_status_if_match(
        scan_id: int,
        current_status: ScanStatus,
        new_status: ScanStatus,
        stopped_at: datetime = None
    ) -> bool:
        """条件更新状态（原子操作）"""
        from django.utils import timezone
        
        update_fields = {
            'status': new_status,
        }
        if stopped_at:
            update_fields['stopped_at'] = stopped_at
        
        updated = Scan.objects.filter(
            id=scan_id,
            status=current_status
        ).update(**update_fields)
        
        return updated > 0
```

#### ✅ 修复方案 2：使用 Service 层
```python
# apps/scan/services/scan_service.py
class ScanService:
    def complete_cancellation(self, scan_id: int) -> bool:
        """完成取消操作（CANCELLING → CANCELLED）"""
        return self.scan_repo.update_status_if_match(
            scan_id=scan_id,
            current_status=ScanStatus.CANCELLING,
            new_status=ScanStatus.CANCELLED,
            stopped_at=timezone.now()
        )
```

#### 修改 Handler
```python
# apps/scan/handlers/initiate_scan_flow_handlers.py
from apps.scan.repositories import DjangoScanRepository

def on_completion(flow: Flow, flow_run: FlowRun, state: State) -> None:
    scan_id = flow_run.parameters.get('scan_id')
    repo = DjangoScanRepository()
    
    # 原子操作：CANCELLING → CANCELLED
    cancelled = repo.update_status_if_match(
        scan_id=scan_id,
        current_status=ScanStatus.CANCELLING,
        new_status=ScanStatus.CANCELLED,
        stopped_at=timezone.now()
    )
    
    if not cancelled:
        # 原子操作：RUNNING → COMPLETED
        completed = repo.update_status_if_match(
            scan_id=scan_id,
            current_status=ScanStatus.RUNNING,
            new_status=ScanStatus.COMPLETED,
            stopped_at=timezone.now()
        )
```

---

## 🟡 本周内完成（High Priority）

### 4. 创建缺失的 Service 层

#### apps/asset/services/
```bash
# 创建目录
mkdir -p apps/asset/services

# 创建文件
touch apps/asset/services/__init__.py
touch apps/asset/services/subdomain_service.py
touch apps/asset/services/website_service.py
touch apps/asset/services/directory_service.py
touch apps/asset/services/ip_address_service.py
```

#### apps/engine/services/
```bash
# 创建目录
mkdir -p apps/engine/services

# 创建文件
touch apps/engine/services/__init__.py
touch apps/engine/services/engine_service.py
```

#### 模板代码
```python
# apps/asset/services/subdomain_service.py
import logging

from apps.asset.repositories import DjangoSubdomainRepository

logger = logging.getLogger(__name__)

class SubdomainService:
    def __init__(self, repository=None):
        self.repo = repository or DjangoSubdomainRepository()
    
    def get_all(self):
        """获取所有子域名"""
        return self.repo.get_all()
    
    def bulk_delete(self, subdomain_ids: list[int]):
        """批量删除子域名"""
        logger.info("批量删除子域名 - IDs: %s", subdomain_ids)
        deleted_count, _ = self.repo.bulk_delete_by_ids(subdomain_ids)
        logger.info("批量删除成功 - 数量: %d", deleted_count)
        return deleted_count

__all__ = ['SubdomainService']
```

---

## 🟢 两周内完成（Medium Priority）

### 5. 补充 Repository Protocol 接口

#### apps/targets/repositories/target_repository.py
```python
from __future__ import annotations
from typing import Protocol, TYPE_CHECKING

if TYPE_CHECKING:
    from ..models import Target

class TargetRepositoryInterface(Protocol):
    """Target 数据访问层抽象接口"""
    
    def get_by_id(self, target_id: int) -> Target | None: ...
    def bulk_delete_by_ids(self, target_ids: list[int]) -> tuple[int, dict]: ...
    def get_or_create(self, name: str, type: str) -> tuple[Target, bool]: ...
```

#### apps/asset/repositories/subdomain_repository.py
```python
from __future__ import annotations
from typing import Protocol, TYPE_CHECKING

if TYPE_CHECKING:
    from apps.asset.models import Subdomain

class SubdomainRepositoryInterface(Protocol):
    """Subdomain 数据访问层抽象接口"""
    
    def get_all(self) -> list[Subdomain]: ...
    def bulk_delete_by_ids(self, ids: list[int]) -> tuple[int, dict]: ...
```

---

## 📋 检查清单

完成每个修复后，打勾确认：

### Views 层检查
- [ ] 移除所有 `.objects` 调用
- [ ] 移除所有 `.save()` 调用
- [ ] 移除所有 `.delete()` 调用
- [ ] 移除所有 `.create()` 调用
- [ ] 通过 Service 层调用所有业务逻辑

### Service 层检查
- [ ] 所有业务逻辑在 Service 层
- [ ] 通过 Repository 层访问数据
- [ ] 包含日志记录
- [ ] 包含异常处理
- [ ] 依赖注入已实现

### Repository 层检查
- [ ] 只包含数据访问代码
- [ ] 没有业务逻辑
- [ ] 使用 ORM 进行数据操作
- [ ] 有 Protocol 接口（可选）

---

## 🧪 测试验证

修复后，运行以下命令验证：

```bash
# 1. 检查语法
source .venv/bin/activate
python -m py_compile apps/asset/services/*.py
python -m py_compile apps/engine/services/*.py

# 2. 检查导入
DJANGO_SETTINGS_MODULE=config.settings python -c "
import django
django.setup()
from apps.asset.services.subdomain_service import SubdomainService
from apps.engine.services.engine_service import EngineService
print('✅ 所有导入成功')
"

# 3. 运行服务器测试
python manage.py runserver
```

---

## 📊 修复进度跟踪

| 任务 | 状态 | 预计时间 | 实际时间 |
|------|------|----------|----------|
| Asset Views 重构 | ⬜ | 4h | - |
| Targets Views 重构 | ⬜ | 3h | - |
| Handlers 重构 | ⬜ | 2h | - |
| Asset Services 创建 | ⬜ | 4h | - |
| Engine Services 创建 | ⬜ | 2h | - |
| Protocol 接口补充 | ⬜ | 3h | - |
| 测试验证 | ⬜ | 2h | - |

**总计：20 小时**

---

## 🎯 最终目标

- ✅ 所有 Views 层不直接操作 ORM
- ✅ 所有模块有完整的 Service 层
- ✅ 所有 Repository 有 Protocol 接口
- ✅ 代码通过 DDD 架构检查
- ✅ 架构评分 > 90%
