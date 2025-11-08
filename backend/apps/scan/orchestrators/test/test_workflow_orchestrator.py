"""
WorkflowOrchestrator 单元测试
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from django.test import TestCase

from apps.scan.models import Scan
from apps.scan.orchestrators.workflow_orchestrator import WorkflowOrchestrator
from apps.common.definitions import ScanTaskStatus


@pytest.mark.django_db
class TestWorkflowOrchestrator(TestCase):
    """WorkflowOrchestrator 测试类"""
    
    def setUp(self):
        """测试初始化"""
        # 创建 mock 对象，避免真实数据库依赖
        self.mock_target = Mock()
        self.mock_target.id = 1
        self.mock_target.name = "test.com"
        
        self.mock_engine = Mock()
        self.mock_engine.id = 1
        self.mock_engine.name = "XingRin Default Engine"
        
        # 创建测试 Scan 对象
        self.scan = Mock(spec=Scan)
        self.scan.id = 1
        self.scan.target = self.mock_target
        self.scan.engine = self.mock_engine
        self.scan.status = ScanTaskStatus.INITIATED
        self.scan.task_names = []
    
    @patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')
    def test_dispatch_workflow_success(self, mock_dag_orchestrator_class):
        """测试工作流编排成功的场景"""
        # 准备测试数据
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {
                    'use_amass': True,
                    'use_subfinder': True
                }
            }
        }
        
        # Mock DAGOrchestrator 实例和返回值
        mock_dag_instance = mock_dag_orchestrator_class.return_value
        mock_workflow = MagicMock()
        task_names = ['subdomain_discovery', 'finalize_scan']
        mock_dag_instance.dispatch_workflow.return_value = (mock_workflow, task_names)
        
        # 在 patch 之后创建编排器
        orchestrator = WorkflowOrchestrator()
        
        # 执行测试
        workflow, result_task_names = orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert workflow is not None, "工作流对象不应为 None"
        assert workflow == mock_workflow, "返回的工作流对象应该是 mock 对象"
        assert result_task_names == task_names, "任务名称列表应该匹配"
        assert len(result_task_names) == 2, "应该包含 2 个任务"
        
        # 验证 DAGOrchestrator 被正确调用
        mock_dag_instance.dispatch_workflow.assert_called_once_with(self.scan, config)
    
    @patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')
    def test_dispatch_workflow_failure(self, mock_dag_orchestrator_class):
        """测试工作流编排失败的场景"""
        # 准备测试数据
        config = {
            'invalid_task': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock DAGOrchestrator 返回失败
        mock_dag_instance = mock_dag_orchestrator_class.return_value
        mock_dag_instance.dispatch_workflow.return_value = (None, [])
        
        # 在 patch 之后创建编排器
        orchestrator = WorkflowOrchestrator()
        
        # 执行测试
        workflow, task_names = orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert workflow is None, "失败时工作流应为 None"
        assert task_names == [], "失败时任务名称列表应为空"
        
        # 验证 DAGOrchestrator 被调用
        mock_dag_instance.dispatch_workflow.assert_called_once_with(self.scan, config)
    
    @patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')
    def test_dispatch_workflow_with_multiple_tasks(self, mock_dag_orchestrator_class):
        """测试多任务工作流编排"""
        # 准备测试数据 - 多个任务配置
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {
                    'use_amass': True,
                    'use_subfinder': True
                }
            },
            'port_scan': {
                'enabled': True,
                'depends_on': ['subdomain_discovery'],
                'config': {
                    'ports': '80,443,8080'
                }
            },
            'tech_stack': {
                'enabled': True,
                'depends_on': ['port_scan'],
                'config': {}
            }
        }
        
        # Mock DAGOrchestrator 返回多任务工作流
        mock_dag_instance = mock_dag_orchestrator_class.return_value
        mock_workflow = MagicMock()
        task_names = ['subdomain_discovery', 'port_scan', 'tech_stack', 'finalize_scan']
        mock_dag_instance.dispatch_workflow.return_value = (mock_workflow, task_names)
        
        # 在 patch 之后创建编排器
        orchestrator = WorkflowOrchestrator()
        
        # 执行测试
        workflow, result_task_names = orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert workflow is not None, "工作流对象不应为 None"
        assert len(result_task_names) == 4, "应该包含 4 个任务"
        assert 'subdomain_discovery' in result_task_names, "应包含子域发现任务"
        assert 'port_scan' in result_task_names, "应包含端口扫描任务"
        assert 'tech_stack' in result_task_names, "应包含技术栈识别任务"
        assert 'finalize_scan' in result_task_names, "应包含结束任务"
    
    @patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')
    def test_dispatch_workflow_empty_config(self, mock_dag_orchestrator_class):
        """测试空配置的场景"""
        # 准备测试数据 - 空配置
        config = {}
        
        # Mock DAGOrchestrator 返回空工作流
        mock_dag_instance = mock_dag_orchestrator_class.return_value
        mock_dag_instance.dispatch_workflow.return_value = (None, [])
        
        # 在 patch 之后创建编排器
        orchestrator = WorkflowOrchestrator()
        
        # 执行测试
        workflow, task_names = orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证结果
        assert workflow is None, "空配置应返回 None"
        assert task_names == [], "空配置应返回空列表"
    
    def test_orchestrator_initialization(self):
        """测试编排器初始化"""
        orchestrator = WorkflowOrchestrator()
        
        # 验证属性存在
        assert hasattr(orchestrator, 'dag_orchestrator'), "应该有 dag_orchestrator 属性"
        assert orchestrator.dag_orchestrator is not None, "dag_orchestrator 不应为 None"
    
    @patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')
    @patch('apps.scan.orchestrators.workflow_orchestrator.logger')
    def test_dispatch_workflow_logging(self, mock_logger, mock_dag_orchestrator_class):
        """测试工作流编排的日志记录"""
        # 准备测试数据
        config = {
            'subdomain_discovery': {
                'enabled': True,
                'depends_on': [],
                'config': {}
            }
        }
        
        # Mock DAGOrchestrator
        mock_dag_instance = mock_dag_orchestrator_class.return_value
        mock_workflow = MagicMock()
        task_names = ['subdomain_discovery', 'finalize_scan']
        mock_dag_instance.dispatch_workflow.return_value = (mock_workflow, task_names)
        
        # 在 patch 之后创建编排器
        orchestrator = WorkflowOrchestrator()
        
        # 执行测试
        orchestrator.dispatch_workflow(self.scan, config)
        
        # 验证日志被调用
        assert mock_logger.info.called, "应该记录 info 日志"
        
        # 验证日志内容
        log_calls = [str(call) for call in mock_logger.info.call_args_list]
        assert any('开始编排工作流' in str(call) for call in log_calls), "应记录开始编排日志"
        assert any('工作流已构建' in str(call) for call in log_calls), "应记录构建成功日志"
    
    @patch('apps.scan.orchestrators.workflow_orchestrator.DAGOrchestrator')
    @patch('apps.scan.orchestrators.workflow_orchestrator.logger')
    def test_dispatch_workflow_warning_on_failure(self, mock_logger, mock_dag_orchestrator_class):
        """测试工作流编排失败时的警告日志"""
        # Mock DAGOrchestrator 返回失败
        mock_dag_instance = mock_dag_orchestrator_class.return_value
        mock_dag_instance.dispatch_workflow.return_value = (None, [])
        
        # 在 patch 之后创建编排器
        orchestrator = WorkflowOrchestrator()
        
        # 执行测试
        orchestrator.dispatch_workflow(self.scan, {})
        
        # 验证警告日志被调用
        assert mock_logger.warning.called, "失败时应该记录 warning 日志"
        
        # 验证日志内容
        warning_call = str(mock_logger.warning.call_args_list[0])
        assert '工作流构建失败' in warning_call, "应记录构建失败警告"


# 如果直接运行此文件
if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])
