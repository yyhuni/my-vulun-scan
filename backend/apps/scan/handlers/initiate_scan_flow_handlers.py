"""
initiate_scan_flow 状态处理器

负责 initiate_scan_flow 生命周期的状态同步（Prefect 3.x 支持的 5 个 Hooks）：
- on_running: Flow 开始运行时更新扫描状态为 RUNNING
- on_completion: Flow 成功完成时更新扫描状态为 COMPLETED
- on_failure: Flow 失败时更新扫描状态为 FAILED（包括超时、异常等所有失败场景）
- on_cancellation: Flow 被取消时更新扫描状态为 CANCELLED
- on_crashed: Flow 崩溃时更新扫描状态为 CRASHED

策略：快速失败（Fail-Fast）
- 任何子任务失败都会导致 Flow 失败
- Flow 成功 = 所有任务成功
- 不需要统计子任务状态（简化架构）

职责分离：
- Flow 层只负责工作流编排和执行
- 状态管理由 Prefect State Hooks 统一处理
- Handler 直接映射 Prefect 状态到业务状态
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
    
    职责：更新 Scan 状态为 COMPLETED
    
    触发时机：
    - Prefect Flow 正常执行完成时自动触发
    - 在 Flow 函数体返回之后调用
    
    策略：快速失败（Fail-Fast）
    - Flow 成功完成 = 所有任务成功 → COMPLETED
    - Flow 执行失败 = 有任务失败 → FAILED (由 on_failed 处理)
    
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
        success = service.update_status(scan_id, ScanTaskStatus.COMPLETED)
        
        if success:
            logger.info(
                "✓ Flow 状态回调：扫描状态已更新为 COMPLETED - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
        else:
            logger.error(
                "✗ Flow 状态回调：更新扫描状态失败 - Scan ID: %s",
                scan_id
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
    - Flow 超时、任务失败等所有失败场景都会触发此回调
    
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


def on_initiate_scan_flow_cancelled(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    initiate_scan_flow 被取消时的回调
    
    职责：更新 Scan 状态为 CANCELLED
    
    触发时机：
    - 用户主动取消扫描任务
    - Flow 被外部系统中止
    - 手动停止 Flow 运行
    
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
        success = service.update_status(
            scan_id, 
            ScanTaskStatus.CANCELLED,
            message="扫描任务已被取消"
        )
        
        if success:
            logger.warning(
                "✗ Flow 状态回调：扫描状态已更新为 CANCELLED - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
    except Exception as e:
        logger.exception(
            "Flow 状态回调异常 - Scan ID: %s, 错误: %s",
            scan_id,
            e
        )


def on_initiate_scan_flow_crashed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    initiate_scan_flow 崩溃时的回调
    
    职责：更新 Scan 状态为 CRASHED，并记录崩溃信息
    
    触发时机（系统级异常）：
    - Prefect Worker 进程被杀（OOM、手动 kill -9）
    - 服务器断电或重启
    - Docker 容器意外退出
    - 网络中断导致 Worker 失联
    - 其他导致进程异常终止的情况
    
    与 on_failure 的区别：
    - on_failure: Flow 代码抛出异常（正常的异常处理）
    - on_crashed: 进程崩溃（系统级故障）
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态（包含崩溃信息）
    """
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    try:
        from apps.scan.services import ScanService
        from apps.common.definitions import ScanTaskStatus
        
        # 提取崩溃信息
        error_message = str(state.message) if state.message else "Flow 崩溃（系统异常）"
        
        service = ScanService()
        success = service.update_status(
            scan_id, 
            ScanTaskStatus.CRASHED,
            message=f"系统崩溃: {error_message}"
        )
        
        if success:
            logger.critical(
                "✗ Flow 状态回调：扫描任务崩溃，状态已更新为 CRASHED - Scan ID: %s, Flow Run: %s, 错误: %s",
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
