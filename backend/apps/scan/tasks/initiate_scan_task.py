"""
扫描任务初始化模块

[已弃用] 此文件已被重构。
新架构：apps/scan/flows/initiate_scan_flow.py

保留此文件是为了防止破坏性变更，未来可以删除。

---

旧的设计（已弃用）：
负责初始化扫描任务，根据 engine 配置调度工作流

特点：
- 轻量级、执行快（<1秒）
- 负责创建工作空间并触发 Prefect Flow
- 状态管理由 Prefect State Handlers 自动处理
"""

from prefect import flow
from apps.scan.orchestrators import WorkflowOrchestrator
from apps.scan.handlers import (
    on_initiate_scan_flow_running,
    on_initiate_scan_flow_completed,
    on_initiate_scan_flow_failed
)
from pathlib import Path
import logging
import yaml

logger = logging.getLogger(__name__)


@flow(
    name='initiate_scan',
    log_prints=True,
    on_running=[on_initiate_scan_flow_running],
    on_completion=[on_initiate_scan_flow_completed],
    on_failure=[on_initiate_scan_flow_failed]
)
def initiate_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    workspace_dir: str,
    engine_name: str,
    engine_config: str
):
    """
    初始化扫描任务，根据 engine 配置动态编排和执行工作流
    
    职责：
    - 创建扫描工作空间目录
    - 解析引擎配置
    - 使用 Orchestrator 构建工作流
    - 执行工作流（调用 Prefect Flow）
    
    不负责：
    - 数据库访问（由 Service 层完成）
    - 状态更新（由 Prefect State Handlers 自动处理）
    - 构建工作流逻辑（由 WorkflowOrchestrator 负责）
    
    职责分离：
    - Service 层: 数据库访问、准备参数、状态初始化
    - Flow 层: 创建目录、编排和执行工作流
    - Handlers 层: 状态自动同步（通过 Prefect Hooks）
    - WorkflowOrchestrator: 编排工作流（构建 Flow 对象）
    
    目录结构：
    - 工作空间：{SCAN_RESULTS_DIR}/scan_{timestamp}/
    - 子任务在工作空间下创建各自的模块目录，如：
      - subdomain_discovery/
      - port_scan/
      - vulnerability_scan/
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        workspace_dir: 工作空间目录路径
        engine_name: 引擎名称
        engine_config: 引擎配置（YAML 格式字符串）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'workspace_dir': str,
            'expected_tasks': list
        }
    
    Raises:
        ValueError: 参数验证失败或配置错误
        RuntimeError: 工作流构建失败
    """
    try:
        # 参数验证
        if not scan_id:
            raise ValueError("scan_id is required")
        if not workspace_dir:
            raise ValueError("workspace_dir is required")
        if not engine_config:
            raise ValueError("engine_config is required")
        
        # 创建扫描工作空间目录
        workspace_path = Path(workspace_dir)
        workspace_path.mkdir(parents=True, exist_ok=True)
        
        logger.info(
            "初始化扫描任务 - Scan ID: %s, Target: %s, Engine: %s, Workspace: %s",
            scan_id, target_name, engine_name, workspace_path
        )
        
        # 解析 engine 配置
        config = _parse_engine_config(engine_config)
        if not config:
            raise ValueError(f"Engine {engine_name} 没有配置，无法启动扫描")
        
        # 使用编排器构建 Prefect Flow
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
        
        # 执行工作流（调用 Prefect Flow）
        logger.info(
            "工作流已启动 - Scan ID: %s, 任务: %s",
            scan_id,
            ' -> '.join(expected_tasks)
        )
        flow_func()
        
        # 返回结果
        return {
            'success': True,
            'scan_id': scan_id,
            'target': target_name,
            'workspace_dir': workspace_dir,
            'expected_tasks': expected_tasks
        }
        
    except ValueError as e:
        # 配置错误或参数验证失败
        logger.error("配置错误: %s", e)
        raise
    except RuntimeError as e:
        # 运行时错误（工作流构建失败）
        logger.error("运行时错误: %s", e)
        raise
    except OSError as e:
        # 文件系统错误（工作空间创建失败）
        logger.error("文件系统错误: %s", e)
        raise
    except Exception as e:  # noqa: BLE001
        # 其他未预期错误
        logger.exception("初始化扫描任务失败: %s", e)
        # 注意：失败状态更新由 Prefect State Handlers 自动处理
        raise


def _parse_engine_config(config_text: str) -> dict:
    """
    解析 engine 的 YAML 配置
    
    Args:
        config_text: YAML 格式的配置文本
    
    Returns:
        解析后的配置字典
    """
    if not config_text or not config_text.strip():
        return {}
    
    try:
        config = yaml.safe_load(config_text)
        return config if config else {}
    except yaml.YAMLError as e:
        logger.error("Failed to parse engine configuration: %s", e)
        return {}
