"""
工作流构建相关的 Prefect Tasks

负责工作流的构建、验证和管理
"""

from prefect import task
from typing import Tuple, Any
import logging

logger = logging.getLogger(__name__)


@task(
    name="build_workflow",
    description="构建扫描工作流",
    retries=1
)
def build_workflow_task(
    scan_id: int,
    target_name: str,
    target_id: int,
    workspace_dir: str,
    config: dict
) -> Tuple[Any, list]:
    """
    使用 WorkflowOrchestrator 构建工作流
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        workspace_dir: 工作空间目录路径
        config: 解析后的配置字典
    
    Returns:
        Tuple[flow_func, expected_tasks]: Flow 函数和预期任务列表
    
    Raises:
        RuntimeError: 工作流构建失败
    """
    from apps.scan.orchestrators import WorkflowOrchestrator
    
    logger.info("开始构建工作流 - Scan ID: %s", scan_id)
    
    orchestrator = WorkflowOrchestrator()
    flow_func, expected_tasks = orchestrator.dispatch_workflow(
        scan_id=scan_id,
        target_name=target_name,
        target_id=target_id,
        workspace_dir=workspace_dir,
        config=config
    )
    
    if not flow_func:
        raise RuntimeError(f"工作流构建失败 - Scan ID: {scan_id}")
    
    if not expected_tasks:
        raise RuntimeError(f"工作流中没有任务 - Scan ID: {scan_id}")
    
    logger.info(
        "✓ 工作流构建成功 - Scan ID: %s, 任务数: %d, 任务: %s",
        scan_id,
        len(expected_tasks),
        ' -> '.join(expected_tasks)
    )
    
    return flow_func, expected_tasks

