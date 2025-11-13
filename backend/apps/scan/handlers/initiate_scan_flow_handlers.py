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


def _retry_database_operation(scan_id: int, operation_func, operation_name: str):
    """
    数据库操作容错重试函数
    
    Args:
        scan_id: 扫描ID
        operation_func: 要执行的数据库操作函数
        operation_name: 操作名称（用于日志）
    
    Returns:
        bool: 操作是否成功
    """
    try:
        return operation_func()
    except Exception as e:
        # 检查是否是数据库连接问题
        if "server closed the connection unexpectedly" in str(e) or "connection" in str(e).lower():
            logger.warning(
                "检测到数据库连接问题，尝试重新连接并重试%s - Scan ID: %s",
                operation_name,
                scan_id
            )
            
            try:
                # 强制关闭当前连接，让Django重新建立连接
                from django.db import connection
                connection.close()
                
                # 重试操作
                result = operation_func()
                logger.info(
                    "✓ 重试成功：%s - Scan ID: %s",
                    operation_name,
                    scan_id
                )
                return result
                
            except Exception as retry_error:
                logger.error(
                    "重试%s失败 - Scan ID: %s, 错误: %s",
                    operation_name,
                    scan_id,
                    retry_error
                )
                return False
        else:
            # 非连接问题，直接抛出
            raise e


def on_initiate_scan_flow_running(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    initiate_scan_flow 开始运行时的回调
    
    职责：更新 Scan 状态为 RUNNING + 发送通知
    
    触发时机：
    - Prefect Flow 状态变为 Running 时自动触发
    - 在 Flow 函数体执行之前调用
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("🚀 initiate_scan_flow_running 回调开始运行 - Flow Run: %s", flow_run.id)
    
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        logger.warning(
            "Flow 参数中缺少 scan_id，跳过状态更新 - Flow Run: %s",
            flow_run.id
        )
        return
    
    def _update_running_status():
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
        return success
    
    # 使用容错机制执行状态更新
    _retry_database_operation(scan_id, _update_running_status, "状态更新为RUNNING")
    
    # 发送通知
    try:
        from apps.scan.notifications import create_notification, NotificationLevel
        create_notification(
            title="扫描开始",
            message=f"扫描任务 #{scan_id} 已开始执行",
            level=NotificationLevel.INFO
        )
    except Exception as e:
        logger.error(f"发送扫描开始通知失败 - Scan ID: {scan_id}: {e}")


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
    logger.info("✅ initiate_scan_flow_completed 回调开始运行 - Flow Run: %s", flow_run.id)
    
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    def _update_completed_status():
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
            return True
        
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
        return True
    
    # 使用容错机制执行状态更新
    _retry_database_operation(scan_id, _update_completed_status, "状态更新为COMPLETED")
    
    # 发送通知
    try:
        from apps.scan.notifications import create_notification, NotificationLevel
        create_notification(
            title="扫描完成",
            message=f"扫描任务 #{scan_id} 已成功完成",
            level=NotificationLevel.INFO
        )
    except Exception as e:
        logger.error(f"发送扫描完成通知失败 - Scan ID: {scan_id}: {e}")


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
    logger.info("❌ initiate_scan_flow_failed 回调开始运行 - Flow Run: %s", flow_run.id)
    
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    def _update_failed_status():
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
            return True
        
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
        return True
    
    # 使用容错机制执行状态更新
    _retry_database_operation(scan_id, _update_failed_status, "状态更新为FAILED")
    
    # 发送通知
    try:
        from apps.scan.notifications import create_notification, NotificationLevel
        error_message = str(state.message) if state.message else "未知错误"
        create_notification(
            title="扫描失败",
            message=f"扫描任务 #{scan_id} 执行失败: {error_message}",
            level=NotificationLevel.IMPORTANT
        )
    except Exception as e:
        logger.error(f"发送扫描失败通知失败 - Scan ID: {scan_id}: {e}")


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
    logger.info("⚠️ initiate_scan_flow_cancelled 回调开始运行 - Flow Run: %s", flow_run.id)
    
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    def _update_cancelled_status():
        from apps.scan.models import Scan
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        # 🔑 原子操作：将 CANCELLING 更新为 CANCELLED
        # 只更新处于 CANCELLING 状态的任务（用户已请求取消）
        updated = Scan.objects.filter(
            id=scan_id,
            status=ScanStatus.CANCELLING  # 只更新 CANCELLING 状态
        ).update(
            status=ScanStatus.CANCELLED,
            error_message="扫描任务已被取消",
            stopped_at=timezone.now()
        )  # type: ignore  # pylint: disable=no-member
        
        if updated > 0:
            logger.warning(
                "✗ Flow 状态回调：扫描状态已原子更新为 CANCELLED - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
        else:
            # 可能状态不是 CANCELLING（已被其他 handler 处理）
            logger.info(
                "ℹ️ Flow 状态回调：Scan 状态不是 CANCELLING，跳过更新 - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
        return True
    
    # 使用容错机制执行状态更新
    _retry_database_operation(scan_id, _update_cancelled_status, "状态更新为CANCELLED")
    
    # 发送通知
    try:
        from apps.scan.notifications import create_notification, NotificationLevel
        create_notification(
            title="扫描取消",
            message=f"扫描任务 #{scan_id} 已被取消",
            level=NotificationLevel.WARNING
        )
    except Exception as e:
        logger.error(f"发送扫描取消通知失败 - Scan ID: {scan_id}: {e}")


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
    logger.info("💥 initiate_scan_flow_crashed 回调开始运行 - Flow Run: %s", flow_run.id)
    
    scan_id = flow_run.parameters.get('scan_id')
    if not scan_id:
        return
    
    def _update_crashed_status():
        from apps.scan.models import Scan
        from apps.common.definitions import ScanStatus
        from django.utils import timezone
        
        # 提取崩溃信息
        error_message = str(state.message) if state.message else "Flow 崩溃（系统异常）"
        full_error = f"系统崩溃: {error_message}"
        
        # 🔑 原子操作：直接更新为 CRASHED
        # Crashed 状态是终态，不需要检查当前状态
        updated = Scan.objects.filter(
            id=scan_id
        ).update(
            status=ScanStatus.CRASHED,
            error_message=full_error[:2000],  # 截断到字段长度
            stopped_at=timezone.now()
        )  # type: ignore  # pylint: disable=no-member
        
        if updated > 0:
            logger.critical(
                "✗ Flow 状态回调：扫描任务崩溃，状态已原子更新为 CRASHED - Scan ID: %s, Flow Run: %s, 错误: %s",
                scan_id,
                flow_run.id,
                error_message
            )
        else:
            logger.warning(
                "⚠️ Flow 状态回调：未找到要更新的 Scan 记录 - Scan ID: %s, Flow Run: %s",
                scan_id,
                flow_run.id
            )
        return True
    
    # 使用容错机制执行状态更新
    _retry_database_operation(scan_id, _update_crashed_status, "状态更新为CRASHED")
    
    # 发送通知
    try:
        from apps.scan.notifications import create_notification, NotificationLevel
        crash_message = str(state.message) if state.message else "系统崩溃"
        create_notification(
            title="扫描崩溃",
            message=f"扫描任务 #{scan_id} 发生严重错误并崩溃: {crash_message}",
            level=NotificationLevel.IMPORTANT
        )
    except Exception as e:
        logger.error(f"发送扫描崩溃通知失败 - Scan ID: {scan_id}: {e}")
