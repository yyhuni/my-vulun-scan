"""
工作流编排器模块

负责根据配置匹配和构建工作流
"""

import logging
from typing import Tuple, Any, Optional

from apps.scan.models import Scan
from .workflow_registry import get_workflow_registry

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """
    工作流编排器
    
    职责：
    - 根据配置匹配工作流模式
    - 构建 Celery workflow 对象
    - 返回工作流供调用者执行
    
    不负责：
    - 执行工作流（由调用者控制）
    """
    
    def __init__(self):
        """初始化编排器"""
        self.registry = get_workflow_registry()
    
    def match_workflow(self, task_kwargs: dict, config: dict) -> Tuple[Optional[Any], list]:
        """
        根据配置匹配预定义的工作流
        
        使用注册表模式，避免 if-else 链，提高扩展性
        
        Args:
            task_kwargs: 任务参数（包含 target, scan_id, target_id, workspace_dir）
            config: 完整配置字典
        
        Returns:
            (workflow, task_names): 工作流对象和任务名称列表，如果未匹配则返回 (None, [])
        """
        # 从 config 推导启用的任务类型
        enabled_tasks = set(config.keys())
        
        # 遍历注册表，找到匹配的工作流
        for _task_type, registry_entry in self.registry.items():
            matcher, builder, workflow_name = registry_entry
            if matcher(enabled_tasks):
                logger.info("✓ 匹配到工作流: %s", workflow_name)
                # 调用构建器，传递任务参数和配置
                return builder(task_kwargs=task_kwargs, config=config)
        
        # 没有匹配到任何工作流
        logger.warning("✗ 未匹配到预定义工作流，任务类型: %s", enabled_tasks)
        return None, []
    
    def dispatch_workflow(self, scan: Scan, config: dict) -> Tuple[Optional[Any], list]:
        """
        根据配置编排工作流（不执行）
        
        职责：
        - 解析配置，匹配工作流模式
        - 构建 Celery workflow 对象
        - 返回工作流供调用者执行
        
        不负责：
        - 执行工作流（由调用者决定执行时机和方式）
        
        Args:
            scan: Scan 对象
            config: 解析后的配置字典
        
        Returns:
            (workflow, task_names): 工作流对象和任务名称列表
            如果未匹配到工作流，返回 (None, [])
        """
        # 准备任务参数（包含所有必要信息）
        task_kwargs = {
            'target': scan.target.name,        # 目标域名
            'scan_id': scan.id,
            'target_id': scan.target.id,
            'workspace_dir': scan.results_dir  # 工作空间目录路径
        }
        
        logger.info("="*60)
        logger.info("目标域名: %s", task_kwargs['target'])
        logger.info("检测到的任务类型: %s", set(config.keys()))
        logger.info("="*60)
        
        # 根据任务组合匹配预定义工作流
        workflow, task_names = self.match_workflow(task_kwargs, config)
        
        if not workflow:
            logger.warning("没有匹配到任何工作流，任务类型: %s", set(config.keys()))
            return None, []
        
        logger.info("="*60)
        logger.info("扫描工作流构建完成")
        logger.info("任务总数: %d", len(task_names))
        logger.info("任务列表: %s", ' -> '.join(task_names))
        logger.info("="*60)
        
        # 返回工作流，由调用者决定何时执行
        logger.info("✓ 工作流已构建 - Scan ID: %s, 任务数: %d", scan.id, len(task_names))
        
        return workflow, task_names

