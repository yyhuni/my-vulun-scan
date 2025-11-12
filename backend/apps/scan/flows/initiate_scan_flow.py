"""
扫描初始化 Flow

负责编排扫描任务的初始化流程

职责：
- 协调 Tasks 的执行顺序
- 处理 Tasks 之间的数据流
- 不包含具体业务逻辑（由 Tasks 实现）

架构：
- Flow: 编排层（本文件）
- Tasks: 执行层（apps/scan/tasks/）
- Handlers: 状态管理（apps/scan/handlers/）
"""

from prefect import flow
from pathlib import Path
import logging

from apps.scan.handlers import (
    on_initiate_scan_flow_running,
    on_initiate_scan_flow_completed,
    on_initiate_scan_flow_failed,
    on_initiate_scan_flow_cancelled,
    on_initiate_scan_flow_crashed
)
from apps.scan.tasks.workspace_tasks import create_scan_workspace_task

logger = logging.getLogger(__name__)




@flow(
    name='initiate_scan',
    description='扫描任务初始化流程',
    log_prints=True,
    on_running=[on_initiate_scan_flow_running],
    on_completion=[on_initiate_scan_flow_completed],
    on_failure=[on_initiate_scan_flow_failed],
    on_cancellation=[on_initiate_scan_flow_cancelled],
    on_crashed=[on_initiate_scan_flow_crashed]
)
def initiate_scan_flow(
    scan_id: int,
    target_name: str,
    target_id: int,
    scan_workspace_dir: str,
    engine_name: str,
    engine_config: str
) -> dict:
    """
    初始化扫描任务（Flow：只负责编排）
    
    基于 engine_name 选择对应的预定义 flow 执行：
    - subdomain_discovery -> subdomain_discovery_flow
    - port_scan -> port_scan_flow (未来扩展)
    - vuln_scan -> vuln_scan_flow (未来扩展)
    
    Args:
        scan_id: 扫描任务 ID
        target_name: 目标名称
        target_id: 目标 ID
        scan_workspace_dir: Scan 工作空间目录路径
        engine_name: 引擎名称（用于选择对应的 flow）
        engine_config: 引擎配置（YAML 格式字符串，作为参数传递）
    
    Returns:
        dict: {
            'success': bool,
            'scan_id': int,
            'target': str,
            'scan_workspace_dir': str,
            'executed_tasks': list
        }
    
    Raises:
        ValueError: 参数验证失败或引擎不存在
        RuntimeError: 执行失败
    """
    try:
        # ==================== 参数验证 ====================
        if not scan_id:
            raise ValueError("scan_id is required")
        if not scan_workspace_dir:
            raise ValueError("scan_workspace_dir is required")
        if not engine_name:
            raise ValueError("engine_name is required")
        
        
        logger.info(
            "="*60 + "\n" +
            "开始初始化扫描任务\n" +
            f"  Scan ID: {scan_id}\n" +
            f"  Target: {target_name}\n" +
            f"  Engine: {engine_name}\n" +
            f"  Workspace: {scan_workspace_dir}\n" +
            "="*60
        )
        
        # ==================== Task 1: 创建 Scan 工作空间 ====================
        scan_workspace_path = create_scan_workspace_task(scan_workspace_dir)
        
        # ==================== Task 2: 根据 engine_name 选择对应的 flow ====================
        logger.info(f"选择执行 flow: {engine_name}")
        
        if engine_name == 'subdomain discovery':
            from apps.scan.flows.subdomain_discovery_flow import subdomain_discovery_flow
            result = subdomain_discovery_flow(
                scan_id=scan_id,
                target_name=target_name,
                target_id=target_id,
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
        elif engine_name == 'port scan':
            from apps.scan.flows.port_scan_flow import port_scan_flow
            result = port_scan_flow(
                scan_id=scan_id,
                target_name=target_name,
                target_id=target_id,
                scan_workspace_dir=str(scan_workspace_path),
                engine_config=engine_config
            )
            
        # 未来扩展:
        # elif engine_name == 'port_scan':
        #     from apps.scan.flows.port_scan_flow import port_scan_flow
        #     result = port_scan_flow(...)
        # elif engine_name == 'vuln_scan':
        #     from apps.scan.flows.vuln_scan_flow import vuln_scan_flow
        #     result = vuln_scan_flow(...)
        else:
            raise ValueError(
                f"未知的引擎: '{engine_name}'. "
                f"可用引擎: subdomain discovery, port scan"
            )
        
        # ==================== 完成 ====================
        # 状态更新由 Handler (on_completed/on_failed) 自动处理
        # - Flow 成功 → Handler 设置 SUCCESSFUL
        # - Flow 失败 → Handler 设置 FAILED
        
        logger.info("="*60 + "\n✓ 扫描任务初始化完成\n" + "="*60)
        
        # ==================== 返回结果 ====================
        return result
        
    except ValueError as e:
        # 参数错误
        logger.error("参数错误: %s", e)
        raise
    except RuntimeError as e:
        # 执行失败
        logger.error("运行时错误: %s", e)
        raise
    except OSError as e:
        # 文件系统错误（工作空间创建失败）
        logger.error("文件系统错误: %s", e)
        raise
    except Exception as e:
        # 其他未预期错误
        logger.exception("初始化扫描任务失败: %s", e)
        # 注意：失败状态更新由 Prefect State Handlers 自动处理
        raise
