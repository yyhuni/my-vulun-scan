"""
工作流调度器模块

负责根据配置匹配和调度工作流
"""

import logging
from typing import Tuple, Any, Optional

from apps.scan.models import Scan
from .workflow_registry import get_workflow_registry

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """工作流调度器"""
    
    def __init__(self):
        """初始化调度器"""
        self.registry = get_workflow_registry()
    
    def match_workflow(self, enabled_tasks: set, target: str, task_kwargs: dict, config: dict) -> Tuple[Optional[Any], list]:
        """
        根据启用的任务类型集合，匹配预定义的工作流
        
        使用注册表模式，避免 if-else 链，提高扩展性
        
        Args:
            enabled_tasks: 配置中出现的任务类型集合（如 {'subdomain_discovery', 'port_scan'}）
            target: 目标域名
            task_kwargs: 任务参数
            config: 完整配置字典
        
        Returns:
            (workflow, task_names): 工作流对象和任务名称列表，如果未匹配则返回 (None, [])
        """
        # 遍历注册表，找到匹配的工作流
        for _task_type, registry_entry in self.registry.items():
            matcher, builder, workflow_name = registry_entry
            if matcher(enabled_tasks):
                logger.info("✓ 匹配到工作流: %s", workflow_name)
                return builder(target, task_kwargs, config)
        
        # 没有匹配到任何工作流
        logger.warning("✗ 未匹配到预定义工作流，任务类型: %s", enabled_tasks)
        return None, []
    
    def dispatch_workflow(self, scan: Scan, config: dict) -> bool:
        """
        根据配置调度工作流
        
        Args:
            scan: Scan 对象
            config: 解析后的配置字典
        
        Returns:
            是否成功调度工作流
        """
        target_domain = scan.target.name
        scan_id = scan.id
        target_id = scan.target.id
        results_dir = scan.results_dir
        
        # 准备任务参数
        task_kwargs = {
            'scan_id': scan_id,
            'target_id': target_id,
            'results_dir': results_dir  # 传递任务主目录
        }
        
        # 检测配置中的任务类型（顶级键）
        enabled_tasks = set(config.keys())
        
        logger.info("="*60)
        logger.info("目标域名: %s", target_domain)
        logger.info("检测到的任务类型: %s", enabled_tasks)
        logger.info("="*60)
        
        # 根据任务组合匹配预定义工作流
        workflow, task_names = self.match_workflow(enabled_tasks, target_domain, task_kwargs, config)
        
        if not workflow:
            logger.warning("没有匹配到任何工作流，任务类型: %s", enabled_tasks)
            return False
        
        logger.info("="*60)
        logger.info("扫描工作流构建完成")
        logger.info("任务总数: %d", len(task_names))
        logger.info("任务列表: %s", ' -> '.join(task_names))
        logger.info("="*60)
        
        # 执行工作流
        result = workflow.apply_async(queue='main_scan_queue')
        
        # 更新 Scan 对象的任务信息
        try:
            self._update_scan_task_info(scan, result, task_names)
            logger.info("✓ 工作流已启动，任务 ID: %s", scan.task_ids)
            return True
        except Exception as e:  # noqa: BLE001
            logger.error("✗ 更新 Scan 对象失败: %s", e)
            return False
    
    @staticmethod
    def _update_scan_task_info(scan: Scan, result, task_names: list) -> None:
        """
        更新 Scan 对象的任务信息
        
        Args:
            scan: Scan 对象
            result: Celery 任务结果
            task_names: 任务名称列表
        """
        if hasattr(result, 'children') and result.children:
            # GroupResult: 获取所有子任务 ID
            child_ids = []
            for child in result.children:
                if hasattr(child, 'id'):
                    child_ids.append(child.id)
                elif hasattr(child, 'children'):
                    # 嵌套的 group
                    child_ids.extend([c.id for c in child.children if hasattr(c, 'id')])
            
            scan.task_ids.extend(child_ids)
            scan.task_names.extend(task_names)
        elif hasattr(result, 'id'):
            # 单个任务
            scan.task_ids.append(result.id)
            scan.task_names.extend(task_names)
        
        scan.save()

