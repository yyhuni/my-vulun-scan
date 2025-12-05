"""
扫描流程处理器

负责处理扫描流程（端口扫描、子域名发现等）的状态变化和通知

职责：
- 更新各阶段的进度状态（running/completed/failed）
- 发送扫描阶段的通知
"""

import logging
from prefect import Flow
from prefect.client.schemas import FlowRun, State

logger = logging.getLogger(__name__)


def _get_stage_from_flow_name(flow_name: str) -> str | None:
    """
    从 Flow name 获取对应的 stage
    
    Flow name 直接作为 stage（与 engine_config 的 key 一致）
    排除主 Flow（initiate_scan）
    """
    # 排除主 Flow，它不是阶段 Flow
    if flow_name == 'initiate_scan':
        return None
    return flow_name


def on_scan_flow_running(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程开始运行时的回调
    
    职责：
    - 更新阶段进度为 running
    - 发送扫描开始通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("🚀 扫描流程开始运行 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    # 提取流程参数
    flow_params = flow_run.parameters or {}
    scan_id = flow_params.get('scan_id')
    target_name = flow_params.get('target_name', 'unknown')
    
    # 更新阶段进度
    stage = _get_stage_from_flow_name(flow.name)
    if scan_id and stage:
        try:
            from apps.scan.services import ScanService
            service = ScanService()
            service.start_stage(scan_id, stage)
            logger.info(f"✓ 阶段进度已更新为 running - Scan ID: {scan_id}, Stage: {stage}")
        except Exception as e:
            logger.error(f"更新阶段进度失败 - Scan ID: {scan_id}, Stage: {stage}: {e}")


def on_scan_flow_completed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程完成时的回调
    
    职责：
    - 更新阶段进度为 completed
    - 发送扫描完成通知（可选）
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("✅ 扫描流程完成 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    # 提取流程参数
    flow_params = flow_run.parameters or {}
    scan_id = flow_params.get('scan_id')
    
    # 更新阶段进度
    stage = _get_stage_from_flow_name(flow.name)
    if scan_id and stage:
        try:
            from apps.scan.services import ScanService
            service = ScanService()
            # 从 flow result 中提取 detail（如果有）
            result = state.result() if state.result else None
            detail = None
            if isinstance(result, dict):
                detail = result.get('detail')
            service.complete_stage(scan_id, stage, detail)
            logger.info(f"✓ 阶段进度已更新为 completed - Scan ID: {scan_id}, Stage: {stage}")
            # 每个阶段完成后刷新缓存统计，便于前端实时看到增量
            try:
                service.update_cached_stats(scan_id)
                logger.info("✓ 阶段完成后已刷新缓存统计 - Scan ID: %s", scan_id)
            except Exception as e:
                logger.error("阶段完成后刷新缓存统计失败 - Scan ID: %s, 错误: %s", scan_id, e)
        except Exception as e:
            logger.error(f"更新阶段进度失败 - Scan ID: {scan_id}, Stage: {stage}: {e}")


def on_scan_flow_failed(flow: Flow, flow_run: FlowRun, state: State) -> None:
    """
    扫描流程失败时的回调
    
    职责：
    - 更新阶段进度为 failed
    - 发送扫描失败通知
    
    Args:
        flow: Prefect Flow 对象
        flow_run: Flow 运行实例
        state: Flow 当前状态
    """
    logger.info("❌ 扫描流程失败 - Flow: %s, Run ID: %s", flow.name, flow_run.id)
    
    # 提取流程参数
    flow_params = flow_run.parameters or {}
    scan_id = flow_params.get('scan_id')
    target_name = flow_params.get('target_name', 'unknown')
    
    # 提取错误信息
    error_message = str(state.message) if state.message else "未知错误"
    
    # 更新阶段进度
    stage = _get_stage_from_flow_name(flow.name)
    if scan_id and stage:
        try:
            from apps.scan.services import ScanService
            service = ScanService()
            service.fail_stage(scan_id, stage, error_message)
            logger.info(f"✓ 阶段进度已更新为 failed - Scan ID: {scan_id}, Stage: {stage}")
        except Exception as e:
            logger.error(f"更新阶段进度失败 - Scan ID: {scan_id}, Stage: {stage}: {e}")
    
    # 发送通知
    try:
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
