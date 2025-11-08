"""
DAGOrchestrator 单元测试

测试 DAG 工作流编排器的所有核心功能：
- 任务构建
- 依赖关系解析
- 拓扑排序
- Celery workflow 构建
- 循环依赖检测
- 边界情况处理
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, PropertyMock
from django.test import TestCase

from apps.scan.models import Scan
from apps.scan.orchestrators.dag_orchestrator import DAGOrchestrator
from apps.common.definitions import ScanTaskStatus


@pytest.mark.django_db
class TestDAGOrchestrator(TestCase):
    """DAGOrchestrator 测试类"""
    
    def setUp(self):
        """测试初始化"""
        # 创建 mock 对象
        self.mock_target = Mock()
        self.mock_target.id = 1
        self.mock_target.name = "test.com"
        
        self.mock_engine = Mock()
        self.mock_engine.id = 1
        self.mock_engine.name = "Test Engine"
        
        # 创建测试 Scan 对象
        self.scan = Mock(spec=Scan)
        self.scan.id = 1
        self.scan.target = self.mock_target
        self.scan.engine = self.mock_engine
        self.scan.status = ScanTaskStatus.INITIATED
        self.scan.results_dir = "/test/results"
        
        # 创建编排器实例
        self.orchestrator = DAGOrchestrator()
    
    # ==================== dispatch_workflow 测试 ====================
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_workflow')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_dependency_stages')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._extract_dependencies')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_tasks')
    def test_dispatch_workflow_single_task(
        self,
        mock_build_tasks,
        mock_extract_deps,
        mock_build_stages,
        mock_build_workflow
    ):
        """测试单任务工作流编排"""
        # 准备测试数据
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock 返回值
        mock_task_sig = Mock()
        mock_task_sig.task = 'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task'
        mock_build_tasks.return_value = {'subdomain_discovery': mock_task_sig}
        mock_extract_deps.return_value = {'subdomain_discovery': []}
        mock_build_stages.return_value = [[mock_task_sig]]
        mock_workflow = MagicMock()
        mock_build_workflow.return_value = mock_workflow
        
        # 执行测试
        workflow, task_names = self.orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert workflow is not None, "工作流对象不应为 None"
        assert len(task_names) == 2, "应该包含 2 个任务（subdomain_discovery + finalize）"
        assert 'finalize_scan' in task_names, "应该包含 finalize_scan"
        
        # 验证调用链
        mock_build_tasks.assert_called_once_with(self.scan, config)
        mock_extract_deps.assert_called_once()
        mock_build_stages.assert_called_once()
        mock_build_workflow.assert_called_once_with([[mock_task_sig]], self.scan.id)
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_tasks')
    def test_dispatch_workflow_no_tasks(self, mock_build_tasks):
        """测试没有可执行任务的场景"""
        # Mock 返回空任务字典
        mock_build_tasks.return_value = {}
        
        # 执行测试，应该抛出 ValueError
        with pytest.raises(ValueError, match="没有可执行的任务"):
            self.orchestrator.dispatch_workflow(self.scan, {})
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_dependency_stages')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._extract_dependencies')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_tasks')
    def test_dispatch_workflow_circular_dependency(
        self,
        mock_build_tasks,
        mock_extract_deps,
        mock_build_stages
    ):
        """测试循环依赖检测"""
        # 准备测试数据
        config = {
            'task_a': {'enabled': True, 'depends_on': ['task_b']},
            'task_b': {'enabled': True, 'depends_on': ['task_a']}
        }
        
        # Mock 返回值
        mock_build_tasks.return_value = {'task_a': Mock(), 'task_b': Mock()}
        mock_extract_deps.return_value = {
            'task_a': ['task_b'],
            'task_b': ['task_a']
        }
        # 拓扑排序应该失败（返回空列表）
        mock_build_stages.return_value = []
        
        # 执行测试，应该抛出 ValueError
        with pytest.raises(ValueError, match="拓扑排序失败"):
            self.orchestrator.dispatch_workflow(self.scan, config)
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_workflow')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_dependency_stages')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._extract_dependencies')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_tasks')
    def test_dispatch_workflow_multiple_stages(
        self,
        mock_build_tasks,
        mock_extract_deps,
        mock_build_stages,
        mock_build_workflow
    ):
        """测试多阶段工作流（串行依赖）"""
        # 准备测试数据
        config = {
            'subdomain_discovery': {'enabled': True, 'depends_on': []},
            'port_scan': {'enabled': True, 'depends_on': ['subdomain_discovery']},
            'tech_stack': {'enabled': True, 'depends_on': ['port_scan']}
        }
        
        # Mock 任务签名
        mock_sig1 = Mock()
        mock_sig1.task = 'subdomain_discovery'
        mock_sig2 = Mock()
        mock_sig2.task = 'port_scan'
        mock_sig3 = Mock()
        mock_sig3.task = 'tech_stack'
        
        mock_build_tasks.return_value = {
            'subdomain_discovery': mock_sig1,
            'port_scan': mock_sig2,
            'tech_stack': mock_sig3
        }
        mock_extract_deps.return_value = {
            'subdomain_discovery': [],
            'port_scan': ['subdomain_discovery'],
            'tech_stack': ['port_scan']
        }
        # 3 个阶段（串行执行）
        mock_build_stages.return_value = [[mock_sig1], [mock_sig2], [mock_sig3]]
        mock_build_workflow.return_value = MagicMock()
        
        # 执行测试
        workflow, task_names = self.orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert len(task_names) == 4, "应该包含 4 个任务（3个任务 + finalize）"
        assert task_names == ['subdomain_discovery', 'port_scan', 'tech_stack', 'finalize_scan']
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_workflow')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_dependency_stages')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._extract_dependencies')
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._build_tasks')
    def test_dispatch_workflow_parallel_tasks(
        self,
        mock_build_tasks,
        mock_extract_deps,
        mock_build_stages,
        mock_build_workflow
    ):
        """测试并行任务执行（同一阶段多个任务）"""
        # 准备测试数据
        config = {
            'task_a': {'enabled': True, 'depends_on': []},
            'task_b': {'enabled': True, 'depends_on': []},
            'task_c': {'enabled': True, 'depends_on': ['task_a', 'task_b']}
        }
        
        # Mock 任务签名
        mock_sig_a = Mock()
        mock_sig_a.task = 'task_a'
        mock_sig_b = Mock()
        mock_sig_b.task = 'task_b'
        mock_sig_c = Mock()
        mock_sig_c.task = 'task_c'
        
        mock_build_tasks.return_value = {
            'task_a': mock_sig_a,
            'task_b': mock_sig_b,
            'task_c': mock_sig_c
        }
        mock_extract_deps.return_value = {
            'task_a': [],
            'task_b': [],
            'task_c': ['task_a', 'task_b']
        }
        # 2 个阶段：第一阶段并行（task_a, task_b），第二阶段串行（task_c）
        mock_build_stages.return_value = [[mock_sig_a, mock_sig_b], [mock_sig_c]]
        mock_build_workflow.return_value = MagicMock()
        
        # 执行测试
        workflow, task_names = self.orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert len(task_names) == 4, "应该包含 4 个任务"
        assert 'task_a' in task_names
        assert 'task_b' in task_names
        assert 'task_c' in task_names
    
    # ==================== _build_tasks 测试 ====================
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._load_task')
    def test_build_tasks_success(self, mock_load_task):
        """测试成功构建任务"""
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock 任务函数
        mock_task_func = Mock()
        mock_task_sig = Mock()
        mock_task_func.si.return_value = mock_task_sig
        mock_load_task.return_value = mock_task_func
        
        # 执行测试
        tasks = self.orchestrator._build_tasks(self.scan, config)
        
        # 验证结果
        assert len(tasks) == 1, "应该构建 1 个任务"
        assert 'subdomain_discovery' in tasks
        
        # 验证任务参数
        mock_task_func.si.assert_called_once_with(
            target='test.com',
            scan_id=1,
            target_id=1,
            workspace_dir='/test/results'
        )
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._load_task')
    def test_build_tasks_disabled_task(self, mock_load_task):
        """测试跳过未启用的任务"""
        config = {
            'subdomain_discovery': {
                'enabled': False,  # 未启用
                'depends_on': [],
                'config': {}
            }
        }
        
        # 执行测试
        tasks = self.orchestrator._build_tasks(self.scan, config)
        
        # 验证结果
        assert len(tasks) == 0, "未启用的任务应该被跳过"
        mock_load_task.assert_not_called()
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._load_task')
    def test_build_tasks_unregistered_task(self, mock_load_task):
        """测试跳过未注册的任务"""
        config = {
            'unknown_task': {  # 未注册的任务
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # 执行测试
        tasks = self.orchestrator._build_tasks(self.scan, config)
        
        # 验证结果
        assert len(tasks) == 0, "未注册的任务应该被跳过"
        mock_load_task.assert_not_called()
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._load_task')
    def test_build_tasks_load_failure(self, mock_load_task):
        """测试任务加载失败"""
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock 加载失败
        mock_load_task.return_value = None
        
        # 执行测试
        tasks = self.orchestrator._build_tasks(self.scan, config)
        
        # 验证结果
        assert len(tasks) == 0, "加载失败的任务应该被跳过"
    
    @patch('apps.scan.orchestrators.dag_orchestrator.DAGOrchestrator._load_task')
    def test_build_tasks_exception_handling(self, mock_load_task):
        """测试任务构建时的异常处理"""
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock 抛出异常
        mock_load_task.side_effect = Exception("加载失败")
        
        # 执行测试（不应该抛出异常，而是跳过该任务）
        tasks = self.orchestrator._build_tasks(self.scan, config)
        
        # 验证结果
        assert len(tasks) == 0, "异常的任务应该被跳过"
    
    # ==================== _load_task 测试 ====================
    
    @patch('apps.scan.orchestrators.dag_orchestrator.import_module')
    def test_load_task_success(self, mock_import_module):
        """测试成功加载任务"""
        # Mock 模块和函数
        mock_module = Mock()
        mock_task_func = Mock()
        mock_module.subdomain_discovery_task = mock_task_func
        mock_import_module.return_value = mock_module
        
        # 执行测试
        result = self.orchestrator._load_task('subdomain_discovery')
        
        # 验证结果
        assert result == mock_task_func, "应该返回任务函数"
        mock_import_module.assert_called_once_with(
            'apps.scan.tasks.subdomain_discovery_task'
        )
    
    def test_load_task_not_in_registry(self):
        """测试加载未注册的任务"""
        # 执行测试
        result = self.orchestrator._load_task('unknown_task')
        
        # 验证结果
        assert result is None, "未注册的任务应该返回 None"
    
    @patch('apps.scan.orchestrators.dag_orchestrator.import_module')
    def test_load_task_import_error(self, mock_import_module):
        """测试模块导入失败"""
        # Mock 导入失败
        mock_import_module.side_effect = ImportError("模块不存在")
        
        # 执行测试
        result = self.orchestrator._load_task('subdomain_discovery')
        
        # 验证结果
        assert result is None, "导入失败应该返回 None"
    
    @patch('apps.scan.orchestrators.dag_orchestrator.import_module')
    def test_load_task_attribute_error(self, mock_import_module):
        """测试函数不存在的情况"""
        # Mock 模块存在但函数不存在
        mock_module = Mock(spec=[])
        mock_import_module.return_value = mock_module
        
        # 执行测试
        result = self.orchestrator._load_task('subdomain_discovery')
        
        # 验证结果
        assert result is None, "函数不存在应该返回 None"
    
    # ==================== _extract_dependencies 测试 ====================
    
    def test_extract_dependencies_simple(self):
        """测试提取简单依赖关系"""
        config = {
            'task_a': {'depends_on': []},
            'task_b': {'depends_on': ['task_a']},
            'task_c': {'depends_on': ['task_b']}
        }
        task_keys = {'task_a', 'task_b', 'task_c'}
        
        # 执行测试
        dependencies = self.orchestrator._extract_dependencies(config, task_keys)
        
        # 验证结果
        assert dependencies == {
            'task_a': [],
            'task_b': ['task_a'],
            'task_c': ['task_b']
        }
    
    def test_extract_dependencies_multiple_deps(self):
        """测试提取多重依赖"""
        config = {
            'task_a': {'depends_on': []},
            'task_b': {'depends_on': []},
            'task_c': {'depends_on': ['task_a', 'task_b']}
        }
        task_keys = {'task_a', 'task_b', 'task_c'}
        
        # 执行测试
        dependencies = self.orchestrator._extract_dependencies(config, task_keys)
        
        # 验证结果
        assert dependencies['task_c'] == ['task_a', 'task_b']
    
    def test_extract_dependencies_invalid_deps(self):
        """测试过滤无效依赖"""
        config = {
            'task_a': {'depends_on': []},
            'task_b': {'depends_on': ['task_a', 'task_x', 'task_y']}  # task_x 和 task_y 不存在
        }
        task_keys = {'task_a', 'task_b'}
        
        # 执行测试
        dependencies = self.orchestrator._extract_dependencies(config, task_keys)
        
        # 验证结果
        assert dependencies['task_b'] == ['task_a'], "应该过滤掉不存在的依赖"
    
    def test_extract_dependencies_no_depends_on_field(self):
        """测试缺少 depends_on 字段的情况"""
        config = {
            'task_a': {},  # 没有 depends_on 字段
        }
        task_keys = {'task_a'}
        
        # 执行测试
        dependencies = self.orchestrator._extract_dependencies(config, task_keys)
        
        # 验证结果
        assert dependencies['task_a'] == [], "缺少 depends_on 应该默认为空列表"
    
    # ==================== _build_dependency_stages 测试 ====================
    
    def test_build_dependency_stages_single_task(self):
        """测试单任务拓扑排序"""
        dependencies = {'task_a': []}
        tasks = {'task_a': Mock()}
        
        # 执行测试
        stages = self.orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 验证结果
        assert len(stages) == 1, "应该有 1 个阶段"
        assert len(stages[0]) == 1, "第一阶段应该有 1 个任务"
    
    def test_build_dependency_stages_sequential(self):
        """测试串行依赖拓扑排序"""
        dependencies = {
            'task_a': [],
            'task_b': ['task_a'],
            'task_c': ['task_b']
        }
        tasks = {
            'task_a': Mock(),
            'task_b': Mock(),
            'task_c': Mock()
        }
        
        # 执行测试
        stages = self.orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 验证结果
        assert len(stages) == 3, "应该有 3 个阶段（串行执行）"
        assert len(stages[0]) == 1, "每个阶段应该有 1 个任务"
        assert len(stages[1]) == 1
        assert len(stages[2]) == 1
    
    def test_build_dependency_stages_parallel(self):
        """测试并行任务拓扑排序"""
        dependencies = {
            'task_a': [],
            'task_b': [],
            'task_c': []
        }
        tasks = {
            'task_a': Mock(),
            'task_b': Mock(),
            'task_c': Mock()
        }
        
        # 执行测试
        stages = self.orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 验证结果
        assert len(stages) == 1, "应该有 1 个阶段（并行执行）"
        assert len(stages[0]) == 3, "第一阶段应该有 3 个任务"
    
    def test_build_dependency_stages_mixed(self):
        """测试混合依赖（并行+串行）"""
        dependencies = {
            'task_a': [],
            'task_b': [],
            'task_c': ['task_a', 'task_b']
        }
        tasks = {
            'task_a': Mock(),
            'task_b': Mock(),
            'task_c': Mock()
        }
        
        # 执行测试
        stages = self.orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 验证结果
        assert len(stages) == 2, "应该有 2 个阶段"
        assert len(stages[0]) == 2, "第一阶段应该有 2 个并行任务"
        assert len(stages[1]) == 1, "第二阶段应该有 1 个任务"
    
    def test_build_dependency_stages_circular_dependency(self):
        """测试循环依赖检测"""
        dependencies = {
            'task_a': ['task_b'],
            'task_b': ['task_a']
        }
        tasks = {
            'task_a': Mock(),
            'task_b': Mock()
        }
        
        # 执行测试，应该抛出 ValueError
        with pytest.raises(ValueError, match="拓扑排序未完成.*循环依赖"):
            self.orchestrator._build_dependency_stages(dependencies, tasks)
    
    def test_build_dependency_stages_no_entry_point(self):
        """测试没有入度为0的任务（循环依赖变体）"""
        dependencies = {
            'task_a': ['task_b'],
            'task_b': ['task_c'],
            'task_c': ['task_a']
        }
        tasks = {
            'task_a': Mock(),
            'task_b': Mock(),
            'task_c': Mock()
        }
        
        # 执行测试，应该抛出 ValueError
        with pytest.raises(ValueError, match="没有入度为 0 的任务"):
            self.orchestrator._build_dependency_stages(dependencies, tasks)
    
    def test_build_dependency_stages_complex_dag(self):
        """测试复杂 DAG"""
        # 复杂依赖关系：
        #     A   B
        #      \ /|
        #       C |
        #      /  |
        #     D   E
        #      \ /
        #       F
        dependencies = {
            'task_a': [],
            'task_b': [],
            'task_c': ['task_a', 'task_b'],
            'task_d': ['task_c'],
            'task_e': ['task_b'],
            'task_f': ['task_d', 'task_e']
        }
        tasks = {
            'task_a': Mock(),
            'task_b': Mock(),
            'task_c': Mock(),
            'task_d': Mock(),
            'task_e': Mock(),
            'task_f': Mock()
        }
        
        # 执行测试
        stages = self.orchestrator._build_dependency_stages(dependencies, tasks)
        
        # 验证结果
        assert len(stages) >= 4, "应该有至少 4 个阶段"
        
        # 验证第一阶段包含 A 和 B（并行）
        first_stage_tasks = [tasks['task_a'], tasks['task_b']]
        assert set(stages[0]) == set(first_stage_tasks), "第一阶段应该是 A 和 B"
        
        # 验证所有任务都被处理
        total_tasks = sum(len(stage) for stage in stages)
        assert total_tasks == 6, "所有 6 个任务都应该被处理"
    
    # ==================== _build_workflow 测试 ====================
    
    @patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
    @patch('apps.scan.orchestrators.dag_orchestrator.chain')
    @patch('apps.scan.orchestrators.dag_orchestrator.group')
    def test_build_workflow_single_stage(self, mock_group, mock_chain, mock_finalize):
        """测试构建单阶段 workflow"""
        # 准备测试数据
        mock_sig = Mock()
        stages = [[mock_sig]]
        
        # Mock finalize_scan_task
        mock_finalize_sig = Mock()
        mock_finalize.si.return_value = mock_finalize_sig
        
        # Mock chain 返回
        mock_workflow = MagicMock()
        mock_chain.return_value = mock_workflow
        
        # 执行测试
        workflow = self.orchestrator._build_workflow(stages, scan_id=1)
        
        # 验证结果
        assert workflow is not None, "应该返回 workflow"
        
        # 验证 chain 被调用（单任务 + finalize）
        mock_chain.assert_called_once()
        call_args = mock_chain.call_args[0]
        assert len(call_args) == 2, "chain 应该包含 2 个元素"
        assert call_args[0] == mock_sig, "第一个元素应该是任务签名"
        assert call_args[1] == mock_finalize_sig, "第二个元素应该是 finalize"
        
        # group 不应该被调用（单任务不需要 group）
        mock_group.assert_not_called()
    
    @patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
    @patch('apps.scan.orchestrators.dag_orchestrator.chain')
    @patch('apps.scan.orchestrators.dag_orchestrator.group')
    def test_build_workflow_parallel_stage(self, mock_group, mock_chain, mock_finalize):
        """测试构建并行任务 workflow"""
        # 准备测试数据（多个任务在同一阶段）
        mock_sig1 = Mock()
        mock_sig2 = Mock()
        stages = [[mock_sig1, mock_sig2]]
        
        # Mock finalize_scan_task
        mock_finalize_sig = Mock()
        mock_finalize.si.return_value = mock_finalize_sig
        
        # Mock group 返回
        mock_group_result = Mock()
        mock_group.return_value = mock_group_result
        
        # Mock chain 返回
        mock_workflow = MagicMock()
        mock_chain.return_value = mock_workflow
        
        # 执行测试
        workflow = self.orchestrator._build_workflow(stages, scan_id=1)
        
        # 验证结果
        assert workflow is not None
        
        # 验证 group 被调用（并行任务）
        mock_group.assert_called_once_with(mock_sig1, mock_sig2)
        
        # 验证 chain 被调用（group + finalize）
        mock_chain.assert_called_once()
        call_args = mock_chain.call_args[0]
        assert len(call_args) == 2
        assert call_args[0] == mock_group_result
        assert call_args[1] == mock_finalize_sig
    
    @patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
    @patch('apps.scan.orchestrators.dag_orchestrator.chain')
    @patch('apps.scan.orchestrators.dag_orchestrator.group')
    def test_build_workflow_multiple_stages(self, mock_group, mock_chain, mock_finalize):
        """测试构建多阶段 workflow"""
        # 准备测试数据（3 个阶段）
        mock_sig1 = Mock()
        mock_sig2 = Mock()
        mock_sig3 = Mock()
        stages = [[mock_sig1], [mock_sig2], [mock_sig3]]
        
        # Mock finalize_scan_task
        mock_finalize_sig = Mock()
        mock_finalize.si.return_value = mock_finalize_sig
        
        # Mock chain 返回
        mock_workflow = MagicMock()
        mock_chain.return_value = mock_workflow
        
        # 执行测试
        workflow = self.orchestrator._build_workflow(stages, scan_id=1)
        
        # 验证结果
        assert workflow is not None
        
        # 验证 chain 被调用（3个任务 + finalize）
        mock_chain.assert_called_once()
        call_args = mock_chain.call_args[0]
        assert len(call_args) == 4, "chain 应该包含 4 个元素"
        assert call_args[-1] == mock_finalize_sig, "最后一个元素应该是 finalize"
    
    @patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
    def test_build_workflow_empty_stages(self, mock_finalize):
        """测试空阶段列表"""
        # 执行测试，应该抛出 ValueError
        with pytest.raises(ValueError, match="阶段列表为空"):
            self.orchestrator._build_workflow([], scan_id=1)
    
    @patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
    @patch('apps.scan.orchestrators.dag_orchestrator.chain')
    def test_build_workflow_exception_handling(self, mock_chain, mock_finalize):
        """测试构建 workflow 时的异常处理"""
        # Mock chain 抛出异常
        mock_chain.side_effect = Exception("构建失败")
        
        # Mock finalize_scan_task
        mock_finalize_sig = Mock()
        mock_finalize.si.return_value = mock_finalize_sig
        
        # 准备测试数据
        stages = [[Mock()]]
        
        # 执行测试，应该抛出 RuntimeError
        with pytest.raises(RuntimeError, match="构建 workflow 失败"):
            self.orchestrator._build_workflow(stages, scan_id=1)
    
    # ==================== 集成测试 ====================
    
    @patch('apps.scan.orchestrators.dag_orchestrator.finalize_scan_task')
    @patch('apps.scan.orchestrators.dag_orchestrator.chain')
    @patch('apps.scan.orchestrators.dag_orchestrator.import_module')
    def test_integration_full_workflow(self, mock_import, mock_chain, mock_finalize):
        """测试完整工作流（集成测试）"""
        # 准备配置
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock 任务模块和函数
        mock_module = Mock()
        mock_task_func = Mock()
        mock_task_sig = Mock()
        mock_task_sig.task = 'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task'
        mock_task_func.si.return_value = mock_task_sig
        mock_module.subdomain_discovery_task = mock_task_func
        mock_import.return_value = mock_module
        
        # Mock finalize
        mock_finalize_sig = Mock()
        mock_finalize.si.return_value = mock_finalize_sig
        
        # Mock chain
        mock_workflow = MagicMock()
        mock_chain.return_value = mock_workflow
        
        # 执行测试
        workflow, task_names = self.orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert workflow is not None
        assert len(task_names) == 2
        assert task_names == [
            'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task',
            'finalize_scan'
        ]
        
        # 验证任务参数
        mock_task_func.si.assert_called_once_with(
            target='test.com',
            scan_id=1,
            target_id=1,
            workspace_dir='/test/results'
        )
        
        # 验证 finalize 参数
        mock_finalize.si.assert_called_once_with(scan_id=1)
    
    # ==================== 边界情况测试 ====================
    
    def test_task_registry_content(self):
        """测试任务注册表的内容"""
        assert 'subdomain_discovery' in self.orchestrator.TASK_REGISTRY
        assert self.orchestrator.TASK_REGISTRY['subdomain_discovery'] == \
            'apps.scan.tasks.subdomain_discovery_task.subdomain_discovery_task'
    
    def test_orchestrator_initialization(self):
        """测试编排器初始化"""
        orchestrator = DAGOrchestrator()
        assert hasattr(orchestrator, 'TASK_REGISTRY')
        assert len(orchestrator.TASK_REGISTRY) > 0


# 如果直接运行此文件
if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])

