# Orchestrator 测试文档

## 测试文件说明

### test_workflow_orchestrator.py
测试 `WorkflowOrchestrator.dispatch_workflow()` 方法的单元测试。

## 运行测试

### 1. 激活虚拟环境
```bash
cd ~/Desktop/scanner
source .venv/bin/activate
```

### 2. 运行所有测试
```bash
cd backend
pytest apps/scan/orchestrators/test/test_workflow_orchestrator.py -v
```

### 3. 运行特定测试
```bash
# 只运行成功场景测试
pytest apps/scan/orchestrators/test/test_workflow_orchestrator.py::TestWorkflowOrchestrator::test_dispatch_workflow_success -v

# 只运行失败场景测试
pytest apps/scan/orchestrators/test/test_workflow_orchestrator.py::TestWorkflowOrchestrator::test_dispatch_workflow_failure -v
```

### 4. 运行测试并查看详细输出
```bash
pytest apps/scan/orchestrators/test/test_workflow_orchestrator.py -v -s
```

### 5. 运行测试并生成覆盖率报告
```bash
pytest apps/scan/orchestrators/test/test_workflow_orchestrator.py --cov=apps.scan.orchestrators.workflow_orchestrator --cov-report=html
```

## 测试覆盖场景

### ✅ 基础功能测试
- `test_dispatch_workflow_success` - 工作流编排成功
- `test_dispatch_workflow_failure` - 工作流编排失败
- `test_orchestrator_initialization` - 编排器初始化

### ✅ 复杂场景测试
- `test_dispatch_workflow_with_multiple_tasks` - 多任务工作流
- `test_dispatch_workflow_empty_config` - 空配置处理

### ✅ 日志测试
- `test_dispatch_workflow_logging` - 成功时的日志记录
- `test_dispatch_workflow_warning_on_failure` - 失败时的警告日志

## 测试架构说明

### Mock 策略
- 使用 `unittest.mock.patch` 装饰器 mock `DAGOrchestrator`
- 使用 `Mock` 和 `MagicMock` 模拟 Scan、Target、Engine 等对象
- 避免真实数据库操作，提高测试速度

### 测试原则
1. **单一职责** - 每个测试只验证一个功能点
2. **独立性** - 测试之间互不依赖
3. **可重复** - 每次运行结果一致
4. **清晰断言** - 断言语句包含错误提示信息

## 依赖要求

确保已安装以下测试依赖：
```bash
pip install pytest pytest-django pytest-cov
```

如果未安装，运行：
```bash
cd ~/Desktop/scanner/backend
pip install -r requirements.txt
```

## 常见问题

### Q: 测试运行报错 "No module named apps"
**A:** 确保在 backend 目录下运行测试，或配置 PYTHONPATH：
```bash
export PYTHONPATH=/Users/yangyang/Desktop/scanner/backend:$PYTHONPATH
```

### Q: 数据库连接错误
**A:** 测试使用 `@pytest.mark.django_db` 装饰器，确保 Django 设置正确。如果仍有问题，检查 `backend/config/settings.py` 中的数据库配置。

### Q: Mock 不生效
**A:** 确保 patch 路径正确，应该是导入路径而非定义路径：
```python
@patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')  # ✅ 正确
@patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator')      # ❌ 错误
```

## 参考文档

- [pytest 官方文档](https://docs.pytest.org/)
- [unittest.mock 文档](https://docs.python.org/3/library/unittest.mock.html)
- [Django Testing 文档](https://docs.djangoproject.com/en/stable/topics/testing/)
