# DAG 编排器测试概览

## 📊 测试统计

| 指标 | 数量 |
|------|------|
| 测试类 | 1 |
| 测试用例 | 30+ |
| 覆盖的方法 | 7 |
| 代码行数 | 680+ |
| 预期覆盖率 | 95%+ |

## 🎯 测试目标

为 `DAGOrchestrator` 类创建全面的单元测试，确保：

1. ✅ 所有核心方法都有测试覆盖
2. ✅ 正常流程和异常流程都被测试
3. ✅ 边界情况得到适当处理
4. ✅ 循环依赖能被正确检测
5. ✅ 并行任务能正确构建
6. ✅ 拓扑排序算法正确实现

## 📋 测试用例清单

### 1. dispatch_workflow 测试（6个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_dispatch_workflow_single_task` | 测试单任务工作流编排 | ✅ |
| `test_dispatch_workflow_no_tasks` | 测试没有可执行任务的场景 | ✅ |
| `test_dispatch_workflow_circular_dependency` | 测试循环依赖检测 | ✅ |
| `test_dispatch_workflow_multiple_stages` | 测试多阶段工作流（串行依赖） | ✅ |
| `test_dispatch_workflow_parallel_tasks` | 测试并行任务执行 | ✅ |

**测试场景示例：**

```python
# 单任务工作流
config = {
    'subdomain_discovery': {
        'enabled': True,
        'depends_on': [],
        'config': {}
    }
}

# 多阶段串行工作流
config = {
    'subdomain_discovery': {'depends_on': []},
    'port_scan': {'depends_on': ['subdomain_discovery']},
    'tech_stack': {'depends_on': ['port_scan']}
}

# 并行任务工作流
config = {
    'task_a': {'depends_on': []},
    'task_b': {'depends_on': []},
    'task_c': {'depends_on': ['task_a', 'task_b']}
}
```

### 2. _build_tasks 测试（5个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_build_tasks_success` | 测试成功构建任务 | ✅ |
| `test_build_tasks_disabled_task` | 测试跳过未启用的任务 | ✅ |
| `test_build_tasks_unregistered_task` | 测试跳过未注册的任务 | ✅ |
| `test_build_tasks_load_failure` | 测试任务加载失败 | ✅ |
| `test_build_tasks_exception_handling` | 测试异常处理 | ✅ |

**测试验证点：**
- ✅ 任务签名正确创建（使用 `.si()`）
- ✅ 任务参数正确传递（target, scan_id, target_id, workspace_dir）
- ✅ 未启用的任务被跳过
- ✅ 未注册的任务被跳过
- ✅ 加载失败不会中断整个流程

### 3. _load_task 测试（4个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_load_task_success` | 测试成功加载任务 | ✅ |
| `test_load_task_not_in_registry` | 测试加载未注册的任务 | ✅ |
| `test_load_task_import_error` | 测试模块导入失败 | ✅ |
| `test_load_task_attribute_error` | 测试函数不存在的情况 | ✅ |

**测试验证点：**
- ✅ 动态导入模块成功
- ✅ 正确获取任务函数
- ✅ 导入错误返回 None
- ✅ 属性错误返回 None

### 4. _extract_dependencies 测试（4个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_extract_dependencies_simple` | 测试提取简单依赖关系 | ✅ |
| `test_extract_dependencies_multiple_deps` | 测试提取多重依赖 | ✅ |
| `test_extract_dependencies_invalid_deps` | 测试过滤无效依赖 | ✅ |
| `test_extract_dependencies_no_depends_on_field` | 测试缺少 depends_on 字段 | ✅ |

**测试验证点：**
- ✅ 正确提取依赖列表
- ✅ 支持多重依赖
- ✅ 自动过滤不存在的依赖
- ✅ 缺少字段时默认为空列表

### 5. _build_dependency_stages 测试（7个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_build_dependency_stages_single_task` | 测试单任务拓扑排序 | ✅ |
| `test_build_dependency_stages_sequential` | 测试串行依赖拓扑排序 | ✅ |
| `test_build_dependency_stages_parallel` | 测试并行任务拓扑排序 | ✅ |
| `test_build_dependency_stages_mixed` | 测试混合依赖（并行+串行） | ✅ |
| `test_build_dependency_stages_circular_dependency` | 测试循环依赖检测 | ✅ |
| `test_build_dependency_stages_no_entry_point` | 测试没有入度为0的任务 | ✅ |
| `test_build_dependency_stages_complex_dag` | 测试复杂 DAG | ✅ |

**拓扑排序算法验证：**

```
复杂 DAG 测试案例：
    A   B
     \ /|
      C |
     /  |
    D   E
     \ /
      F

预期结果：
Stage 1: [A, B]  (并行)
Stage 2: [C, E]  (并行)
Stage 3: [D]     (串行)
Stage 4: [F]     (串行)
```

**测试验证点：**
- ✅ Kahn 算法正确实现
- ✅ 入度计算正确
- ✅ 阶段划分正确
- ✅ 循环依赖能被检测
- ✅ 所有任务都被处理

### 6. _build_workflow 测试（5个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_build_workflow_single_stage` | 测试构建单阶段 workflow | ✅ |
| `test_build_workflow_parallel_stage` | 测试构建并行任务 workflow | ✅ |
| `test_build_workflow_multiple_stages` | 测试构建多阶段 workflow | ✅ |
| `test_build_workflow_empty_stages` | 测试空阶段列表 | ✅ |
| `test_build_workflow_exception_handling` | 测试异常处理 | ✅ |

**Celery Canvas 结构验证：**
- ✅ 单任务：直接使用签名
- ✅ 并行任务：使用 `group()` 包装
- ✅ 多阶段：使用 `chain()` 串联
- ✅ 自动添加 `finalize_scan_task`

### 7. 集成测试（1个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_integration_full_workflow` | 测试完整工作流（端到端） | ✅ |

**端到端测试验证：**
- ✅ 从配置到 workflow 的完整流程
- ✅ 所有方法正确协作
- ✅ 参数正确传递
- ✅ 返回值正确

### 8. 边界情况测试（2个用例）

| 测试用例 | 描述 | 状态 |
|----------|------|------|
| `test_task_registry_content` | 测试任务注册表的内容 | ✅ |
| `test_orchestrator_initialization` | 测试编排器初始化 | ✅ |

## 🛠️ 测试技术栈

- **测试框架**: pytest + pytest-django
- **Mock 框架**: unittest.mock
- **断言风格**: pytest assert
- **数据库**: 使用 `@pytest.mark.django_db` 标记

## 📦 Mock 策略

### 1. 外部依赖 Mock

```python
# Mock Celery 任务加载
@patch('apps.scan.orchestrators.dag_orchestrator.import_module')

# Mock Celery Canvas
@patch('apps.scan.orchestrators.dag_orchestrator.chain')
@patch('apps.scan.orchestrators.dag_orchestrator.group')

# Mock finalize_scan_task
@patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
```

### 2. 数据对象 Mock

```python
# Mock Scan 对象
self.scan = Mock(spec=Scan)
self.scan.id = 1
self.scan.target.name = "test.com"
self.scan.results_dir = "/test/results"
```

### 3. 内部方法 Mock

```python
# Mock 内部辅助方法
@patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_tasks')
@patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._extract_dependencies')
```

## 🎨 测试模式

### 1. AAA 模式（Arrange-Act-Assert）

```python
def test_example(self):
    # Arrange: 准备测试数据
    config = {'task': {'enabled': True}}
    
    # Act: 执行被测试的方法
    result = self.orchestrator.dispatch_workflow(self.scan, config)
    
    # Assert: 验证结果
    assert result is not None
```

### 2. 异常测试模式

```python
def test_exception(self):
    with pytest.raises(ValueError, match="错误消息"):
        self.orchestrator.method_that_raises()
```

### 3. Mock 验证模式

```python
def test_mock_verification(self):
    mock_func.do_something()
    
    # 验证调用
    mock_func.assert_called_once()
    mock_func.assert_called_with(expected_args)
```

## 📈 覆盖率目标

| 方法 | 行数 | 覆盖的测试用例数 | 覆盖率目标 |
|------|------|------------------|------------|
| `dispatch_workflow` | ~40 | 5 | 95%+ |
| `_build_tasks` | ~40 | 5 | 95%+ |
| `_load_task` | ~20 | 4 | 100% |
| `_extract_dependencies` | ~30 | 4 | 95%+ |
| `_build_dependency_stages` | ~70 | 7 | 95%+ |
| `_build_workflow` | ~30 | 5 | 95%+ |

## 🚀 运行测试

### 快速开始

```bash
# 进入测试目录
cd /Users/yangyang/Desktop/scanner/backend/apps/scan/orchestrators/test

# 运行所有测试
./run_tests.sh

# 运行特定类型的测试
./run_tests.sh workflow    # 工作流测试
./run_tests.sh tasks       # 任务构建测试
./run_tests.sh deps        # 依赖关系测试
./run_tests.sh stages      # 拓扑排序测试

# 生成覆盖率报告
./run_tests.sh coverage
```

### 手动运行

```bash
cd /Users/yangyang/Desktop/scanner/backend

# 运行所有测试
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py -v

# 运行特定测试
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_dispatch_workflow_single_task -v
```

## 📝 测试清单

使用此清单确保所有测试场景都被覆盖：

- [x] 单任务工作流
- [x] 多阶段串行工作流
- [x] 并行任务工作流
- [x] 混合依赖工作流
- [x] 空配置处理
- [x] 循环依赖检测
- [x] 无入度任务检测
- [x] 任务启用/禁用
- [x] 任务注册验证
- [x] 任务加载失败
- [x] 模块导入失败
- [x] 依赖关系提取
- [x] 无效依赖过滤
- [x] 拓扑排序正确性
- [x] Celery Canvas 构建
- [x] finalize_scan_task 添加
- [x] 异常处理
- [x] 边界条件

## 🔍 测试质量指标

- ✅ **完整性**: 所有公开和私有方法都有测试
- ✅ **隔离性**: 使用 Mock 隔离外部依赖
- ✅ **可读性**: 清晰的测试名称和注释
- ✅ **可维护性**: 使用 setUp 避免重复代码
- ✅ **可靠性**: 测试结果稳定，不依赖外部状态

## 📚 相关文档

- [README.md](./README.md) - 详细测试文档
- [run_tests.sh](./run_tests.sh) - 测试运行脚本
- [test_dag_orchestrator.py](./test_dag_orchestrator.py) - 测试代码

## 🎓 学习资源

### 测试金字塔

```
       /\
      /E2E\        端到端测试（少量）
     /------\
    / 集成测试 \    集成测试（适量）
   /----------\
  /  单元测试   \   单元测试（大量）✓ 我们在这里
 /--------------\
```

### 测试最佳实践

1. **测试应该快速**: 单元测试应该在毫秒级完成
2. **测试应该独立**: 每个测试不依赖其他测试
3. **测试应该可重复**: 多次运行结果一致
4. **测试应该自动化**: 可以自动运行和验证
5. **测试应该有意义**: 测试真实的业务场景

## 🐛 已知问题

- 无

## 🔮 未来改进

- [ ] 添加性能基准测试
- [ ] 添加更多复杂 DAG 场景
- [ ] 集成到 CI/CD 流水线
- [ ] 添加测试数据生成器
- [ ] 添加参数化测试

---

**创建日期**: 2025-11-08  
**最后更新**: 2025-11-08  
**作者**: AI Assistant  
**版本**: 1.0.0

