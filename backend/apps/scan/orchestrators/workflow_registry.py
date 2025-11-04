"""
工作流注册表模块

使用注册表模式管理所有工作流构建器，支持灵活扩展
"""

from typing import Callable, Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


def _build_subdomain_only_workflow(target: str, task_kwargs: dict, config: dict) -> Tuple[Any, list]:
    """
    构建仅子域名发现工作流
    
    Args:
        target: 目标域名
        task_kwargs: 任务参数
        config: 配置字典
    
    Returns:
        (workflow, task_names): 工作流对象和任务名称列表
    """
    from apps.scan.tasks.subdomain_discovery_task import subdomain_discovery_task
    
    logger.info("构建 Subdomain Only 工作流")
    
    if 'subdomain_discovery' not in config:
        logger.warning("subdomain_discovery 未在配置中")
        return None, []
    
    workflow = subdomain_discovery_task.si(target=target, **task_kwargs)
    task_names = ['subdomain_discovery']
    
    logger.info("✓ subdomain_discovery")
    
    return workflow, task_names


def get_workflow_registry() -> Dict[str, Tuple[Callable[[set], bool], Callable[[str, Dict, Dict], Tuple[Any, list]], str]]:
    """
    获取工作流注册表
    
    注册表模式：任务类型 -> (匹配函数, 构建函数, 工作流名称)
    好处：
    1. 扩展性强：添加新工作流只需在注册表中添加条目
    2. 解耦：匹配逻辑不需要知道具体构建器
    3. 清晰：所有工作流映射一目了然
    
    Returns:
        工作流注册表字典
    """
    return {
        'subdomain_discovery': (
            lambda enabled_tasks: 'subdomain_discovery' in enabled_tasks,
            _build_subdomain_only_workflow,
            'Subdomain Discovery Only'
        ),
        # 未来可以轻松添加新的工作流：
        # 'port_scan': (
        #     lambda enabled_tasks: 'port_scan' in enabled_tasks,
        #     _build_port_scan_only_workflow,
        #     'Port Scan Only'
        # ),
    }

