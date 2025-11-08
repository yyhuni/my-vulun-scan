# DAG 编排器测试文档

## 📋 测试文件

### test_dag_orchestrator.py

全面测试 `DAGOrchestrator` 的所有核心功能，包括：

#### 1. 工作流编排测试 (`dispatch_workflow`)
- ✅ 单任务工作流编排
- ✅ 多阶段串行工作流（任务依赖链）
- ✅ 并行任务执行（同一阶段多任务）
- ✅ 空任务配置处理
- ✅ 循环依赖检测
- ✅ 工作流构建失败处理

#### 2. 任务构建测试 (`_build_tasks`)
- ✅ 成功构建任务签名
- ✅ 跳过未启用的任务
- ✅ 跳过未注册的任务
- ✅ 任务加载失败处理
- ✅ 异常处理

#### 3. 任务加载测试 (`_load_task`)
- ✅ 成功加载任务函数
- ✅ 未注册任务处理
- ✅ 模块导入失败处理
- ✅ 函数不存在处理

#### 4. 依赖关系提取测试 (`_extract_dependencies`)
- ✅ 简单依赖关系
- ✅ 多重依赖
- ✅ 过滤无效依赖
- ✅ 缺少 `depends_on` 字段处理

#### 5. 拓扑排序测试 (`_build_dependency_stages`)
- ✅ 单任务拓扑排序
- ✅ 串行依赖（多阶段）
- ✅ 并行任务（同阶段）
- ✅ 混合依赖（并行+串行）
- ✅ 循环依赖检测
- ✅ 无入度为0的任务检测
- ✅ 复杂 DAG 测试

#### 6. Workflow 构建测试 (`_build_workflow`)
- ✅ 单阶段 workflow
- ✅ 并行任务 workflow（使用 group）
- ✅ 多阶段 workflow（使用 chain）
- ✅ 空阶段列表处理
- ✅ 构建异常处理

#### 7. 集成测试
- ✅ 完整工作流端到端测试

#### 8. 边界情况测试
- ✅ 任务注册表验证
- ✅ 编排器初始化验证

## 🚀 运行测试

### 方式 1: 使用 pytest（推荐）

```bash
# 进入后端目录
cd /Users/yangyang/Desktop/scanner/backend

# 激活虚拟环境（如果有）
# source venv/bin/activate

# 运行所有 DAG 编排器测试
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py -v

# 运行特定测试类
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator -v

# 运行特定测试方法
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_dispatch_workflow_single_task -v

# 显示详细输出（包括 print 语句）
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py -v -s

# 运行测试并显示覆盖率
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py --cov=apps.scan.orchestrators.dag_orchestrator --cov-report=html
```

### 方式 2: 使用 Django 测试命令

```bash
cd /Users/yangyang/Desktop/scanner/backend

# 运行所有测试
python manage.py test apps.scan.orchestrators.test.test_dag_orchestrator

# 运行特定测试类
python manage.py test apps.scan.orchestrators.test.test_dag_orchestrator.TestDAGOrchestrator

# 运行特定测试方法
python manage.py test apps.scan.orchestrators.test.test_dag_orchestrator.TestDAGOrchestrator.test_dispatch_workflow_single_task
```

### 方式 3: 直接运行测试文件

```bash
cd /Users/yangyang/Desktop/scanner/backend

# 设置 Django 配置
export DJANGO_SETTINGS_MODULE=config.settings

# 运行测试
python apps/scan/orchestrators/test/test_dag_orchestrator.py
```

## 📊 测试覆盖率

测试文件包含 **30+ 个测试用例**，覆盖：

- ✅ 所有公开方法
- ✅ 所有私有辅助方法
- ✅ 正常流程
- ✅ 异常流程
- ✅ 边界情况
- ✅ 错误处理

目标覆盖率：**95%+**

## 🔍 测试示例

### 测试单任务工作流

```python
@patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_workflow')
def test_dispatch_workflow_single_task(self, mock_build_workflow):
    config = {
        'subdomain_discovery': {
            'enabled': True,
            'depends_on': [],
            'config': {}
        }
    }
    
    workflow, task_names = self.orchestrator.dispatch_workflow(self.scan, config)
    
    assert workflow is not None
    assert len(task_names) == 2  # subdomain_discovery + finalize
```

### 测试循环依赖检测

```python
def test_build_dependency_stages_circular_dependency(self):
    dependencies = {
        'task_a': ['task_b'],
        'task_b': ['task_a']
    }
    tasks = {'task_a': Mock(), 'task_b': Mock()}
    
    with pytest.raises(ValueError, match="循环依赖"):
        self.orchestrator._build_dependency_stages(dependencies, tasks)
```

## 🐛 调试技巧

### 1. 查看详细日志

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### 2. 使用 pdb 调试

```python
import pdb; pdb.set_trace()
```

### 3. 查看 Mock 调用历史

```python
print(mock_object.call_args_list)
print(mock_object.call_count)
```

## 📝 测试最佳实践

### 1. 使用 Mock 对象

测试使用 `unittest.mock` 来隔离依赖：

```python
from unittest.mock import Mock, patch, MagicMock

# Mock Scan 对象
self.scan = Mock(spec=Scan)
self.scan.id = 1
self.scan.target.name = "test.com"
```

### 2. 测试命名约定

- 测试类：`TestXXX`
- 测试方法：`test_xxx_yyy`
- 使用描述性名称，如 `test_dispatch_workflow_circular_dependency`

### 3. 断言最佳实践

```python
# 好的断言
assert len(tasks) == 1, "应该构建 1 个任务"
assert 'subdomain_discovery' in tasks

# 避免的断言
assert tasks  # 不够明确
```

### 4. 测试隔离

每个测试应该独立运行，不依赖其他测试的状态：

```python
def setUp(self):
    """在每个测试前重置状态"""
    self.orchestrator = DAGOrchestrator()
```

## 🔗 相关文件

- **被测试文件**: `apps/scan/orchestrators/dag_orchestrator.py`
- **其他测试**: `test_workflow_orchestrator.py`
- **配置**: `backend/pyproject.toml`

## 📚 参考资料

- [pytest 文档](https://docs.pytest.org/)
- [Django 测试文档](https://docs.djangoproject.com/en/5.2/topics/testing/)
- [unittest.mock 文档](https://docs.python.org/3/library/unittest.mock.html)
- [Celery 测试文档](https://docs.celeryproject.org/en/stable/userguide/testing.html)

## ⚠️ 注意事项

1. **数据库依赖**: 使用 `@pytest.mark.django_db` 标记需要数据库的测试
2. **Celery 依赖**: Mock Celery 任务，避免真实执行
3. **模块导入**: 确保 `DJANGO_SETTINGS_MODULE` 环境变量正确设置
4. **Redis 依赖**: 测试中不依赖真实的 Redis 服务

## 🎯 持续改进

### 未来可以添加的测试

- [ ] 性能测试（大规模 DAG）
- [ ] 压力测试（并发执行）
- [ ] 集成测试（与真实 Celery 集成）
- [ ] 端到端测试（完整扫描流程）

