"""
取消状态监控任务

负责监控 Flow Run 的取消状态，确保数据库状态最终同步到 CANCELLED。

使用场景：
- on_cancellation handler 未触发（Prefect task runner bug）
- 竞态条件导致 handler 未正确执行
- 需要兜底保障确保状态一致性

工作流程：
1. 每 5 秒轮询 Prefect API 查询 Flow Run 状态
2. 如果发现状态变为 CANCELLED，立即同步到数据库
3. 如果 Flow 已结束（COMPLETED/FAILED/CRASHED），交给对应 handler 处理
4. 超时后强制标记为 CANCELLED
"""

import logging
from prefect import task
from prefect import get_client
from uuid import UUID
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


@task(name="monitor_cancellation", retries=0, log_prints=True)
async def monitor_cancellation_task(
    scan_id: int, 
    flow_run_id: str, 
    timeout_seconds: int = 300
) -> str:
    """
    监控 Flow Run 状态，确保取消成功
    
    Args:
        scan_id: 扫描任务 ID
        flow_run_id: Prefect Flow Run ID
        timeout_seconds: 监控超时时间（秒），默认 300 秒（5 分钟）
    
    Returns:
        状态结果字符串：'CANCELLED', 'COMPLETED', 'FAILED', 'CRASHED', 'TIMEOUT'
    
    优势：
    - 与 Prefect 架构一致
    - 自动记录到 Prefect UI
    - 支持异步，资源占用低
    - 避免 Django 数据库连接线程安全问题
    
    Note:
        这是一个兜底机制，正常情况下 handler 会处理状态更新。
        只有在 handler 失效时，这个任务才会介入更新数据库。
    """
    from apps.scan.services import ScanService
    from apps.common.definitions import ScanStatus
    from django.utils import timezone
    
    start_time = datetime.now()
    check_interval = 5  # 每 5 秒检查一次
    check_count = 0
    
    logger.info(
        "🔍 开始监控取消状态 - Scan ID: %s, Flow Run: %s, 超时: %d 秒（%.1f 分钟）",
        scan_id, flow_run_id, timeout_seconds, timeout_seconds / 60
    )
    
    try:
        async with get_client() as client:
            while (datetime.now() - start_time).total_seconds() < timeout_seconds:
                check_count += 1
                
                try:
                    # 查询 Prefect 状态
                    flow_run = await client.read_flow_run(UUID(flow_run_id))
                    current_state = flow_run.state_type
                    
                    logger.debug(
                        "检查 #%d - Flow Run 状态: %s - Scan ID: %s",
                        check_count, current_state, scan_id
                    )
                    
                    # 🔑 状态判断
                    if current_state == "CANCELLED":
                        # Prefect 已取消，同步到数据库
                        service = ScanService()
                        success = service.update_status(
                            scan_id, 
                            ScanStatus.CANCELLED,
                            error_message="取消成功（监控任务同步）",
                            stopped_at=timezone.now()
                        )
                        
                        if success:
                            logger.info(
                                "✅ 监控任务：已同步 CANCELLED 状态到数据库 - Scan ID: %s, 检查次数: %d",
                                scan_id, check_count
                            )
                            # 更新缓存统计数据（终态）
                            service.update_cached_stats(scan_id)
                            return "CANCELLED"
                        else:
                            logger.error(
                                "❌ 监控任务：更新数据库失败 - Scan ID: %s",
                                scan_id
                            )
                            # 继续尝试
                    
                    elif current_state in ["COMPLETED", "FAILED", "CRASHED"]:
                        # Flow 已结束，交给对应 handler 处理
                        logger.info(
                            "ℹ️ 监控任务：Flow 已进入终态 %s，交由 handler 处理 - Scan ID: %s",
                            current_state, scan_id
                        )
                        return current_state
                    
                    elif current_state in ["RUNNING", "SCHEDULED", "PENDING", "CANCELLING"]:
                        # Flow 仍在运行或正在取消，继续等待
                        logger.debug(
                            "⏳ 监控任务：Flow 仍在运行（状态: %s），继续等待 - Scan ID: %s",
                            current_state, scan_id
                        )
                    
                    else:
                        # 未知状态
                        logger.warning(
                            "⚠️ 监控任务：检测到未知状态 %s - Scan ID: %s",
                            current_state, scan_id
                        )
                
                except Exception as e:
                    logger.error(
                        "监控任务：查询 Flow Run 状态失败 - Scan ID: %s, 错误: %s",
                        scan_id, e
                    )
                
                # 继续等待
                await asyncio.sleep(check_interval)
            
            # ⏰ 超时处理
            logger.warning(
                "⏰ 监控任务：超时（%d 秒 / %.1f 分钟），强制标记为 CANCELLED - Scan ID: %s, 检查次数: %d",
                timeout_seconds, timeout_seconds / 60, scan_id, check_count
            )
            
            service = ScanService()
            success = service.update_status(
                scan_id, 
                ScanStatus.CANCELLED,
                error_message=f"取消超时（监控 {timeout_seconds} 秒后强制标记）",
                stopped_at=timezone.now()
            )
            
            if success:
                logger.info(
                    "✅ 监控任务：超时后已强制标记为 CANCELLED - Scan ID: %s",
                    scan_id
                )
                # 更新缓存统计数据（终态）
                service.update_cached_stats(scan_id)
            else:
                logger.error(
                    "❌ 监控任务：超时后强制标记失败 - Scan ID: %s",
                    scan_id
                )
            
            return "TIMEOUT"
    
    except Exception as e:
        logger.exception(
            "监控任务：执行异常 - Scan ID: %s, 错误: %s",
            scan_id, e
        )
        return "ERROR"
