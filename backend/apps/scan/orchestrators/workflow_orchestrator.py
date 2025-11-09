"""
工作流编排器模块

负责根据配置构建 DAG 工作流
使用 Prefect Flow 实现
"""

import logging
from typing import Tuple, Any, Optional

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
    - 访问数据库（接受参数而不是模型对象）
    
    架构说明：
    - 完全替换了之前的 Celery Canvas 模式
    - 使用 DAGOrchestrator 实现配置驱动的动态工作流
    - 支持任务依赖关系和自动并行化
    - 返回 Prefect Flow 函数
    - 通过参数传递实现与数据层解耦
    """
    
    def __init__(self):
        """初始化编排器"""
        self.dag_orchestrator = DAGOrchestrator()
    
    def dispatch_workflow(
        self,
        scan_id: int,
        target_name: str,
        target_id: int,
        workspace_dir: str,
        config: dict
    ) -> Tuple[Optional[Any], list]:
        """
        根据配置编排工作流（使用 Prefect DAG）
        
        Args:
            scan_id: 扫描任务 ID
            target_name: 目标名称
            target_id: 目标 ID
            workspace_dir: 工作空间目录路径
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
        logger.info("开始编排工作流 - Scan ID: %s", scan_id)
        
        # 使用 DAG 编排器构建 Prefect Flow
        flow_func, expected_tasks = self.dag_orchestrator.build_scan_flow(
            scan_id=scan_id,
            target_name=target_name,
            target_id=target_id,
            workspace_dir=workspace_dir,
            config=config
        )
        
        if not flow_func:
            logger.warning("工作流构建失败 - Scan ID: %s", scan_id)
            return None, []
        
        logger.info("✓ 工作流已构建 - Scan ID: %s, 任务数: %d", scan_id, len(expected_tasks))
        
        return flow_func, expected_tasks

