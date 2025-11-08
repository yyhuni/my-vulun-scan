# 🚀 快速开始指南

## 📦 创建的文件

| 文件 | 大小 | 描述 |
|------|------|------|
| `test_dag_orchestrator.py` | 29KB | 主测试文件（30+ 测试用例） |
| `README.md` | 6.3KB | 详细测试文档 |
| `TEST_OVERVIEW.md` | 10KB | 测试概览和统计 |
| `run_tests.sh` | 5.9KB | 测试运行脚本 |

## ⚡ 快速运行测试

### 方法 1: 使用测试脚本（推荐）

```bash
cd /Users/yangyang/Desktop/scanner/backend/apps/scan/orchestrators/test

# 运行所有测试
./run_tests.sh

# 运行特定分组
./run_tests.sh workflow   # 工作流测试
./run_tests.sh tasks      # 任务构建测试
./run_tests.sh deps       # 依赖关系测试
./run_tests.sh stages     # 拓扑排序测试

# 生成覆盖率报告
./run_tests.sh coverage

# 查看帮助
./run_tests.sh help
```

### 方法 2: 直接使用 pytest

```bash
cd /Users/yangyang/Desktop/scanner/backend

# 确保已安装依赖
pip install -r requirements.txt

# 运行所有测试
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py -v

# 运行单个测试
pytest apps/scan/orchestrators/test/test_dag_orchestrator.py::TestDAGOrchestrator::test_dispatch_workflow_single_task -v
```

## 📊 测试覆盖概览

### 测试统计
- **测试类**: 1 个
- **测试用例**: 30+ 个
- **代码行数**: 680+ 行
- **覆盖的方法**: 7 个核心方法
- **预期覆盖率**: 95%+

### 测试分组

1. **dispatch_workflow** - 6 个测试
   - 单任务工作流
   - 多阶段工作流
   - 并行任务工作流
   - 循环依赖检测
   - 空配置处理

2. **_build_tasks** - 5 个测试
   - 任务构建成功
   - 跳过未启用任务
   - 跳过未注册任务
   - 加载失败处理
   - 异常处理

3. **_load_task** - 4 个测试
   - 成功加载任务
   - 未注册任务
   - 导入错误
   - 属性错误

4. **_extract_dependencies** - 4 个测试
   - 简单依赖
   - 多重依赖
   - 无效依赖过滤
   - 缺少字段处理

5. **_build_dependency_stages** - 7 个测试
   - 单任务拓扑排序
   - 串行拓扑排序
   - 并行拓扑排序
   - 混合拓扑排序
   - 循环依赖检测
   - 无入度任务检测
   - 复杂 DAG

6. **_build_workflow** - 5 个测试
   - 单阶段 workflow
   - 并行任务 workflow
   - 多阶段 workflow
   - 空阶段处理
   - 异常处理

7. **集成测试** - 1 个测试
   - 完整工作流端到端测试

8. **边界测试** - 2 个测试
   - 注册表验证
   - 初始化验证

## 🎯 关键测试场景

### 场景 1: 单任务工作流
```python
config = {
    'subdomain_discovery': {
        'enabled': True,
        'depends_on': [],
        'config': {}
    }
}
# 预期: [subdomain_discovery] -> [finalize_scan]
```

### 场景 2: 串行依赖工作流
```python
config = {
    'subdomain_discovery': {'depends_on': []},
    'port_scan': {'depends_on': ['subdomain_discovery']},
    'tech_stack': {'depends_on': ['port_scan']}
}
# 预期: [subdomain] -> [port_scan] -> [tech_stack] -> [finalize]
```

### 场景 3: 并行任务工作流
```python
config = {
    'task_a': {'depends_on': []},
    'task_b': {'depends_on': []},
    'task_c': {'depends_on': ['task_a', 'task_b']}
}
# 预期: [task_a ∥ task_b] -> [task_c] -> [finalize]
```

### 场景 4: 循环依赖检测
```python
config = {
    'task_a': {'depends_on': ['task_b']},
    'task_b': {'depends_on': ['task_a']}
}
# 预期: ValueError("拓扑排序未完成...循环依赖")
```

## 📖 文档说明

### README.md
- 完整的测试文档
- 测试用例详解
- 运行方法说明
- 调试技巧
- 最佳实践

### TEST_OVERVIEW.md
- 测试概览和统计
- 测试清单
- 覆盖率目标
- Mock 策略
- 测试模式

### run_tests.sh
- 自动化测试脚本
- 支持多种运行模式
- 彩色输出
- 覆盖率报告生成

## 🔧 故障排查

### 问题 1: pytest 未安装
```bash
pip install pytest pytest-django
```

### 问题 2: Django 模块找不到
```bash
export DJANGO_SETTINGS_MODULE=config.settings
cd /Users/yangyang/Desktop/scanner/backend
```

### 问题 3: 数据库连接错误
确保 PostgreSQL 服务运行：
```bash
cd /Users/yangyang/Desktop/scanner/docker/infrastructure
docker-compose up -d postgres
```

## 📈 下一步

1. **运行测试**: 使用 `./run_tests.sh` 验证所有测试通过
2. **查看覆盖率**: 使用 `./run_tests.sh coverage` 生成覆盖率报告
3. **阅读文档**: 查看 `README.md` 了解更多细节
4. **集成 CI/CD**: 将测试集成到持续集成流程中

## 💡 提示

- 测试使用 Mock 对象，不需要真实的 Celery、Redis 或任务文件
- 所有测试都是独立的，可以单独运行
- 使用 `-v` 标志查看详细输出
- 使用 `-s` 标志查看 print 输出
- 使用 `--tb=short` 简化错误追踪信息

## 📞 获取帮助

如果遇到问题：
1. 查看 `README.md` 的故障排查部分
2. 检查测试日志输出
3. 确认环境依赖已正确安装
4. 验证 Django 设置正确

---

**创建日期**: 2025-11-08  
**最后更新**: 2025-11-08

