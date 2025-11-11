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
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        service = ScanService()
        success = service.update_status(
            scan_id, 
            ScanStatus.RUNNING,
            started_at=timezone.now()  # Handler 决定设置开始时间
        )
        
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
    
    竞态条件处理：
    - 如果状态为 CANCELLING，说明用户已取消但 Flow 自然完成了
    - 优先遵循用户意图，更新为 CANCELLED 而不是 COMPLETED
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    try:
        from apps.scan.models import Scan
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        # 🔑 原子操作 1：尝试将 CANCELLING 更新为 CANCELLED（竞态条件兜底）
        # 如果状态是 CANCELLING，说明用户已取消，优先遵循用户意图
        cancelled_updated = Scan.objects.filter(
            id=scan_id,
            status=ScanStatus.CANCELLING  # 条件：只有是 CANCELLING 才更新
        ).update(
            status=ScanStatus.CANCELLED,
            error_message="扫描在完成前被取消（竞态条件）",
            stopped_at=timezone.now()
        )  # type: ignore  # pylint: disable=no-member
        
        if cancelled_updated > 0:
            # 成功更新（状态确实是 CANCELLING）
            logger.warning(
                "⚠️ Flow 状态回调：检测到竞态条件，已将 CANCELLING 原子更新为 CANCELLED - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
            return
        
        # 🔑 原子操作 2：尝试将 RUNNING 更新为 COMPLETED（正常完成）
        # 只有状态是 RUNNING 时才更新（避免覆盖其他状态）
        completed_updated = Scan.objects.filter(
            id=scan_id,
            status=ScanStatus.RUNNING  # 条件：只有是 RUNNING 才更新
        ).update(
            status=ScanStatus.COMPLETED,
            stopped_at=timezone.now()
        )  # type: ignore  # pylint: disable=no-member
        
        if completed_updated > 0:
            # 成功更新（正常完成流程）
            logger.info(
                "✓ Flow 状态回调：扫描状态已原子更新为 COMPLETED - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
        else:
            # 未更新任何记录，可能是：
            # 1. Scan 不存在
            # 2. 状态既不是 CANCELLING 也不是 RUNNING（如已被其他进程更新）
            logger.warning(
                "⚠️ Flow 状态回调：未更新任何记录（可能已被其他进程处理）- Scan ID: %s, Flow Run: %s",
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
    - Flow 超时、任务失败等所有失败场景都会触发此回调
    
    竞态条件处理：
    - 如果状态为 CANCELLING，说明用户已取消但 Flow 失败了
    - 优先遵循用户意图，更新为 CANCELLED 而不是 FAILED
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态（包含错误信息）
    """
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    try:
        from apps.scan.models import Scan
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        # 提取错误信息
        error_message = str(state.message) if state.message else "Flow 执行失败"
        
        # 🔑 原子操作 1：尝试将 CANCELLING 更新为 CANCELLED（竞态条件兜底）
        # 如果状态是 CANCELLING，说明用户已取消，优先遵循用户意图
        cancelled_updated = Scan.objects.filter(
            id=scan_id,
            status=ScanStatus.CANCELLING  # 条件：只有是 CANCELLING 才更新
        ).update(
            status=ScanStatus.CANCELLED,
            error_message="扫描在失败前被取消（竞态条件）",
            stopped_at=timezone.now()
        )  # type: ignore  # pylint: disable=no-member
        
        if cancelled_updated > 0:
            # 成功更新（状态确实是 CANCELLING）
            logger.warning(
                "⚠️ Flow 状态回调：检测到竞态条件，已将 CANCELLING 原子更新为 CANCELLED - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
            return
        
        # 🔑 原子操作 2：尝试将 RUNNING 更新为 FAILED（正常失败）
        # 只有状态是 RUNNING 时才更新（避免覆盖其他状态）
        failed_updated = Scan.objects.filter(
            id=scan_id,
            status=ScanStatus.RUNNING  # 条件：只有是 RUNNING 才更新
        ).update(
            status=ScanStatus.FAILED,
            error_message=error_message,
            stopped_at=timezone.now()
        )  # type: ignore  # pylint: disable=no-member
        
        if failed_updated > 0:
            # 成功更新（正常失败流程）
            logger.error(
                "✗ Flow 状态回调：扫描状态已原子更新为 FAILED - Scan ID: %s, Flow Run: %s, 错误: %s",
                scan_id,
                flow_run.id,
                error_message
            )
        else:
            # 未更新任何记录，可能是：
            # 1. Scan 不存在
            # 2. 状态既不是 CANCELLING 也不是 RUNNING（如已被其他进程更新）
            logger.warning(
                "⚠️ Flow 状态回调：未更新任何记录（可能已被其他进程处理）- Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
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
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        service = ScanService()
        success = service.update_status(
            scan_id, 
            ScanStatus.CANCELLED,
            error_message="扫描任务已被取消",
            stopped_at=timezone.now()  # Handler 决定设置结束时间
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
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        # 提取崩溃信息
        error_message = str(state.message) if state.message else "Flow 崩溃（系统异常）"
        
        service = ScanService()
        success = service.update_status(
            scan_id, 
            ScanStatus.CRASHED,
            error_message=f"系统崩溃: {error_message}",
            stopped_at=timezone.now()  # Handler 决定设置结束时间
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
