"""
扫描流程处理器

负责处理扫描流程（端口扫描、子域名发现等）的状态变化和通知
"""

import logging
from prefect import Flow
from prefect.client.schemas import FlowRun, State

logger = logging.getLogger(__name__)


def on_scan_flow_running(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程开始运行时的回调
    
    职责：发送扫描开始通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("🚀 扫描流程开始运行 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    try:
        # 提取流程参数
        flow_params = flow_run.parameters or {}
        target_name = flow_params.get('target_name', 'unknown')
        
        from apps.scan.notifications import create_notification, NotificationLevel
        message = f"任务：{flow.name}\n"
        create_notification(
            title=target_name,
            message=message,
            level=NotificationLevel.LOW
        )
        
        logger.info(f"✓ 扫描开始通知已发送 - Target: {target_name}, Flow: {flow.name}")
        
    except Exception as e:
        logger.error(f"发送扫描开始通知失败 - Flow: {flow.name}: {e}")


def on_scan_flow_completed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程完成时的回调
    
    职责：发送扫描完成通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("✅ 扫描流程完成 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    # try:
    #     # 提取流程参数
    #     flow_params = flow_run.parameters or {}
    #     target_name = flow_params.get('target_name', 'unknown')
        
    #     from apps.scan.notifications import create_notification, NotificationLevel
    #     message = f"任务：{flow.name}\n状态：已成功完成"
    #     create_notification(
    #         title=target_name,
    #         message=message,
    #         level=NotificationLevel.LOW
    #     )
        
    #     logger.info(f"✓ 扫描完成通知已发送 - Target: {target_name}, Flow: {flow.name}")
        
    # except Exception as e:
    #     logger.error(f"发送扫描完成通知失败 - Flow: {flow.name}: {e}")


def on_scan_flow_failed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程失败时的回调
    
    职责：发送扫描失败通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("❌ 扫描流程失败 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    try:
        # 提取流程参数
        flow_params = flow_run.parameters or {}
        target_name = flow_params.get('target_name', 'unknown')
        
        # 提取错误信息
        error_message = str(state.message) if state.message else "未知错误"
        
        from apps.scan.notifications import create_notification, NotificationLevel
        message = f"任务：{flow.name}\n状态：执行失败\n错误：{error_message}"
        create_notification(
            title=target_name,
            message=message,
            level=NotificationLevel.HIGH
        )
        
        logger.error(f"✓ 扫描失败通知已发送 - Target: {target_name}, Flow: {flow.name}, Error: {error_message}")
        
    except Exception as e:
        logger.error(f"发送扫描失败通知失败 - Flow: {flow.name}: {e}")


def on_scan_flow_cancelled(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程取消时的回调
    
    职责：发送扫描取消通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("⚠️ 扫描流程取消 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    try:
        # 提取流程参数
        flow_params = flow_run.parameters or {}
        target_name = flow_params.get('target_name', 'unknown')
        
        from apps.scan.notifications import create_notification, NotificationLevel
        message = f"任务：{flow.name}\n状态：已被取消"
        create_notification(
            title=target_name,
            message=message,
            level=NotificationLevel.MEDIUM
        )
        
        logger.info(f"✓ 扫描取消通知已发送 - Target: {target_name}, Flow: {flow.name}")
        
    except Exception as e:
        logger.error(f"发送扫描取消通知失败 - Flow: {flow.name}: {e}")


def on_scan_flow_crashed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程崩溃时的回调
    
    职责：发送扫描崩溃通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("💥 扫描流程崩溃 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    try:
        # 提取流程参数
        flow_params = flow_run.parameters or {}
        target_name = flow_params.get('target_name', 'unknown')
        
        # 提取崩溃信息
        crash_message = str(state.message) if state.message else "系统崩溃"
        
        from apps.scan.notifications import create_notification, NotificationLevel
        message = f"任务：{flow.name}\n状态：发生严重错误并崩溃\n错误：{crash_message}"
        create_notification(
            title=target_name,
            message=message,
            level=NotificationLevel.HIGH
        )
        
        logger.critical(f"✓ 扫描崩溃通知已发送 - Target: {target_name}, Flow: {flow.name}, Crash: {crash_message}")
        
    except Exception as e:
        logger.error(f"发送扫描崩溃通知失败 - Flow: {flow.name}: {e}")
