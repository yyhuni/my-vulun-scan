"""
工作流编排器模块

负责根据配置构建 DAG 工作流
使用 Prefect Flow 实现
"""

import logging
from typing import Tuple, Any, Optional

from apps.scan.models import Scan
from .dag_orchestrator import DAGOrchestrator

logger = logging.getLogger(__name__)


class WorkflowOrchestrator:
    """
    工作流编排器
    
    职责：
    - 使用 DAG 编排器动态构建工作流
    - 返回 Prefect Flow 函数供调用者执行
    
    不负责：
    - 执行工作流（由调用者控制）
    
    架构说明：
    - 完全替换了之前的 Celery Canvas 模式
    - 使用 DAGOrchestrator 实现配置驱动的动态工作流
    - 支持任务依赖关系和自动并行化
    - 返回 Prefect Flow 函数
    """
    
    def __init__(self):
        """初始化编排器"""
        self.dag_orchestrator = DAGOrchestrator()
    
    def dispatch_workflow(self, scan: Scan, config: dict) -> Tuple[Optional[Any], list]:
        """
        根据配置编排工作流（使用 Prefect DAG）
        
        Args:
            scan: Scan 对象
            config: 解析后的配置字典（包含 depends_on 字段）
        
        Returns:
            (flow_func, task_names): Prefect Flow 函数和任务名称列表
            如果构建失败，返回 (None, [])
        
        配置示例：
            {
                'subdomain_discovery': {
                    'enabled': True,
                    'depends_on': [],
                    'config': {...}
                }
            }
        """
        logger.info("开始编排工作流 - Scan ID: %s", scan.id)
        
        # 使用 DAG 编排器构建 Prefect Flow
        flow_func, expected_tasks = self.dag_orchestrator.build_scan_flow(scan, config)
        
        if not flow_func:
            logger.warning("工作流构建失败 - Scan ID: %s", scan.id)
            return None, []
        
        logger.info("✓ 工作流已构建 - Scan ID: %s, 任务数: %d", scan.id, len(expected_tasks))
        
        return flow_func, expected_tasks

