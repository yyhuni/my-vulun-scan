"""
initiate_scan_flow 状态处理器

负责 initiate_scan_flow 生命周期的状态同步：
- on_running: Flow 开始运行时更新扫描状态为 RUNNING
- on_completion: Flow 成功完成时更新扫描状态为 SUCCESSFUL
- on_failure: Flow 失败时更新扫描状态为 FAILED

职责分离：
- Flow 层只负责工作流编排和执行
- 状态管理由 Prefect State Hooks 自动触发
- 解耦业务逻辑和工作流执行
"""

import logging
from prefect import Flow
from prefect.client.schemas import FlowRun, State

logger = logging.getLogger(__name__)


def on_initiate_scan_flow_running(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    initiate_scan_flow 开始运行时的回调
    
    职责：更新 Scan 状态为 RUNNING
    
    触发时机：
    - Prefect Flow 状态变为 Running 时自动触发
    - 在 Flow 函数体执行之前调用
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        logger.warning(
            "Flow 参数中缺少 scan_id，跳过状态更新 - Flow Run: %s",
            flow_run.id
        )
        return
    
    try:
        from apps.scan.services import ScanService
        from apps.common.definitions import ScanTaskStatus
        
        service = ScanService()
        success = service.update_status(scan_id, ScanTaskStatus.RUNNING)
        
        if success:
            logger.info(
                "✓ Flow 状态回调：扫描状态已更新为 RUNNING - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
        else:
            logger.error(
                "✗ Flow 状态回调：更新扫描状态失败 - Scan ID: %s",
                scan_id
            )
    except Exception as e:
        # 状态更新失败不应该中断 Flow 执行
        logger.exception(
            "Flow 状态回调异常 - Scan ID: %s, 错误: %s",
            scan_id,
            e
        )


def on_initiate_scan_flow_completed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    initiate_scan_flow 成功完成时的回调
    
    职责：更新 Scan 状态为 SUCCESSFUL
    
    触发时机：
    - Prefect Flow 正常执行完成时自动触发
    - 在 Flow 函数体返回之后调用
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    try:
        from apps.scan.services import ScanService
        from apps.common.definitions import ScanTaskStatus
        
        service = ScanService()
        success = service.update_status(scan_id, ScanTaskStatus.SUCCESSFUL)
        
        if success:
            logger.info(
                "✓ Flow 状态回调：扫描状态已更新为 SUCCESSFUL - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
    except Exception as e:
        logger.exception(
            "Flow 状态回调异常 - Scan ID: %s, 错误: %s",
            scan_id,
            e
        )


def on_initiate_scan_flow_failed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    initiate_scan_flow 失败时的回调
    
    职责：更新 Scan 状态为 FAILED，并记录错误信息
    
    触发时机：
    - Prefect Flow 执行失败或抛出异常时自动触发
    - 即使 Flow 中途崩溃也会被调用
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态（包含错误信息）
    """
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    try:
        from apps.scan.services import ScanService
        from apps.common.definitions import ScanTaskStatus
        
        # 提取错误信息
        error_message = str(state.message) if state.message else "Flow 执行失败"
        
        service = ScanService()
        success = service.update_status(
            scan_id, 
            ScanTaskStatus.FAILED,
            message=error_message
        )
        
        if success:
            logger.error(
                "✗ Flow 状态回调：扫描状态已更新为 FAILED - Scan ID: %s, Flow Run: %s, 错误: %s",
                scan_id,
                flow_run.id,
                error_message
            )
    except Exception as e:
        logger.exception(
            "Flow 状态回调异常 - Scan ID: %s, 错误: %s",
            scan_id,
            e
        )
