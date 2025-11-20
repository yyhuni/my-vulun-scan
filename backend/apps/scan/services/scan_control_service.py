"""
扫描控制服务

职责：
- 停止扫描
- 删除扫描（两阶段删除）
- Prefect Flow Run 管理
"""

import asyncio
import logging
from typing import Dict, List
from django.db import transaction
from django.db.utils import DatabaseError, OperationalError
from django.core.exceptions import ObjectDoesNotExist
from asgiref.sync import async_to_sync

from apps.common.definitions import ScanStatus
from apps.scan.repositories import DjangoScanRepository

logger = logging.getLogger(__name__)


# 导入顶层函数
from apps.scan.services.scan_service import _submit_flow_deployment


class ScanControlService:
    """
    扫描控制服务
    
    职责：
    - 停止扫描（取消 Flow Run）
    - 删除扫描（两阶段删除）
    - 批量操作
    """
    
    def __init__(self):
        """
        初始化服务
        """
        self.scan_repo = DjangoScanRepository()
    
    def _submit_delete_flow(self, deployment_name: str, parameters: Dict) -> str:
        """
        提交删除任务 Flow (异步转同步)
        """
        return _submit_flow_deployment(deployment_name, parameters)

    def delete_scans_two_phase(self, scan_ids: List[int]) -> dict:
        """
        两阶段删除扫描任务
        
        1. 软删除：立即更新 deleted_at 字段
        2. 硬删除：提交 Prefect 任务异步执行物理删除
        
        Args:
            scan_ids: 扫描任务 ID 列表
            
        Returns:
            删除结果统计
        """
        # 1. 获取要删除的 Scan 信息
        scans = self.scan_repo.get_all(prefetch_relations=False).filter(id__in=scan_ids)
        if not scans.exists():
            raise ValueError("未找到要删除的 Scan")
            
        scan_names = [f"Scan #{s.id}" for s in scans]
        existing_ids = [s.id for s in scans]
        
        # 2. 第一阶段：软删除
        soft_count = self.scan_repo.soft_delete_by_ids(existing_ids)
        logger.info(f"✓ 软删除完成: {soft_count} 个 Scan")
        
        # 3. 第二阶段：提交硬删除任务
        logger.info(f"🔵 提交 Prefect 删除任务 - Scan: {', '.join(scan_names[:5])}{'...' if len(scan_names) > 5 else ''}")
        
        try:
            flow_kwargs = {
                'scan_ids': existing_ids,
                'scan_names': scan_names
            }
            
            # 提交 Flow
            flow_run_id = self._submit_delete_flow(
                deployment_name="delete-scans/delete-scans-on-demand",
                parameters=flow_kwargs
            )
            
            logger.info(f"✓ Prefect 删除任务已提交 - Flow Run ID: {flow_run_id}")
            
        except Exception as e:
            logger.error(f"❌ 提交 Prefect 任务失败: {e}", exc_info=True)
            # 软删除已成功，这里只记录错误，不回滚
            logger.warning("硬删除可能未成功提交，请检查 Prefect 服务状态")
            
        return {
            'soft_deleted_count': soft_count,
            'scan_names': scan_names,
            'hard_delete_scheduled': True
        }
    
    def stop_scan(self, scan_id: int) -> tuple[bool, int]:
        """
        主动停止扫描任务（用户发起）
        
        工作流程：
        1. 验证扫描状态（只能停止 RUNNING/INITIATED）
        2. 发送 Cancelling 信号到 Prefect Flow Runs
        3. 立即更新状态为 CANCELLING（前端显示）
        4. Worker 检测到信号后终止 Flow（3-5秒内）
        5. on_cancellation handler 自动更新为 CANCELLED
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            (是否成功, 发送取消信号的 Flow Run 数量)
        
        状态转换：
            RUNNING/INITIATED → CANCELLING → CANCELLED
            ↑                   ↑             ↑
            当前状态            此方法设置     Handler 自动设置
        
        Note:
            使用 Cancelling 状态而不是直接 Cancelled，
            确保 Prefect Handler 被触发，实现状态管理的统一
            
        并发安全：
            使用数据库行锁（select_for_update）防止并发修改，
            避免用户重复点击导致的重复操作
        """
        try:
            # 1. 在事务内获取扫描对象、检查状态、更新状态（加锁，防止并发）
            with transaction.atomic():
                # 使用 select_for_update() 加行锁，防止并发修改
                scan = self.scan_repo.get_by_id_for_update(scan_id)
                if not scan:
                    logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                    return False, 0
                
                # 2. 验证状态（只能停止 RUNNING/INITIATED）
                if scan.status not in [ScanStatus.RUNNING, ScanStatus.INITIATED]:
                    logger.warning(
                        "无法停止扫描：当前状态为 %s - Scan ID: %s",
                        ScanStatus(scan.status).label,
                        scan_id
                    )
                    return False, 0
                
                # 3. 获取任务列表（在锁内读取，确保数据一致性）
                flow_run_ids = scan.flow_run_ids or []
                
                # 4. 立即更新状态为 CANCELLING（在锁内，确保原子性）
                # 这样第二个并发请求会看到 CANCELLING 状态，直接返回失败
                if flow_run_ids:
                    scan.status = ScanStatus.CANCELLING
                    scan.save(update_fields=['status'])
                    logger.info(
                        "✓ 已更新状态为 CANCELLING（事务内）- Scan ID: %s",
                        scan_id
                    )
            
            # 事务结束，锁释放
            # 后续耗时操作在事务外执行，避免长时间持有锁
            
            # 4. 发送取消信号到 Prefect（使用 Cancelling 状态）
            # 策略：设置为 Cancelling → Worker 检测 → 终止 Flow → 触发 Handler → 自动更新 DB
            cancelled_count = 0
            if flow_run_ids:
                from prefect import get_client
                from uuid import UUID
                
                async def _cancel_flows():
                    """
                    发送取消信号到 Prefect Flow Runs（并行处理，带超时保护）
                    
                    工作流程：
                    1. 并行设置所有 Flow Run 状态为 Cancelling（取消信号）
                    2. Worker 检测到 Cancelling 状态后会主动终止 Flow 执行
                    3. Flow 自然进入 Cancelled 状态
                    4. 触发 on_initiate_scan_flow_cancelled handler
                    5. Handler 自动更新数据库状态为 CANCELLED
                    
                    优势：
                    - 并行处理，速度更快
                    - 单个失败不影响其他
                    - 超时保护（10秒）
                    - 自动资源管理
                    """
                    from prefect.states import Cancelling
                    
                    async def _cancel_single_flow(client, flow_run_id: str) -> bool:
                        """
                        取消单个 Flow Run（带超时保护）
                        
                        Returns:
                            True: 成功发送取消信号
                            False: 失败（超时或异常）
                        """
                        try:
                            # 添加 10 秒超时保护
                            await asyncio.wait_for(
                                client.set_flow_run_state(
                                    flow_run_id=UUID(flow_run_id),
                                    state=Cancelling(message="用户手动取消扫描"),
                                    force=True
                                ),
                                timeout=10.0
                            )
                            logger.debug(
                                "✓ 已发送取消信号 - Flow Run: %s, Scan ID: %s",
                                flow_run_id, scan_id
                            )
                            return True
                        except asyncio.TimeoutError:
                            logger.error(
                                "✗ 发送取消信号超时（10秒）- Flow Run: %s, Scan ID: %s",
                                flow_run_id, scan_id
                            )
                            return False
                        except Exception as e:
                            logger.error(
                                "✗ 发送取消信号失败 - Flow Run: %s, Scan ID: %s, Error: %s",
                                flow_run_id, scan_id, e
                            )
                            return False
                    
                    try:
                        async with get_client() as client:
                            # 并行处理所有 Flow Run
                            tasks = [
                                _cancel_single_flow(client, flow_run_id)
                                for flow_run_id in flow_run_ids
                            ]
                            
                            # return_exceptions=True: 单个失败不影响其他
                            results = await asyncio.gather(*tasks, return_exceptions=True)
                            
                            # 统计成功数量
                            success_count = sum(1 for r in results if r is True)
                            
                            logger.info(
                                "取消信号发送完成 - 成功: %d/%d, Scan ID: %s",
                                success_count, len(flow_run_ids), scan_id
                            )
                            
                            return success_count
                    
                    except Exception as e:
                        # 捕获 get_client() 或其他意外错误
                        logger.error(
                            "连接 Prefect Server 失败 - Scan ID: %s, Error: %s",
                            scan_id, e
                        )
                        return 0
                
                try:
                    # 使用 async_to_sync 而不是 asyncio.run，避免 ASGI 事件循环冲突
                    cancelled_count = async_to_sync(_cancel_flows)()
                    logger.info(
                        "✓ 已发送取消信号给 %d/%d 个 Flow Run - Scan ID: %s",
                        cancelled_count, len(flow_run_ids), scan_id
                    )
                    logger.info(
                        "Worker 将在 3-5 秒内检测到信号并终止 Flow 执行，"
                        "on_cancellation handler 会自动更新数据库状态为 CANCELLED"
                    )
                except Exception as e:
                    logger.error("连接 Prefect Server 失败: %s", e)
                    return False, 0
            else:
                logger.info("无关联 Flow Run 需要取消 - Scan ID: %s", scan_id)
            
            # 5. 启动监控任务（兜底保障）
            # 在后台监控 Flow Run 状态，确保最终同步到 CANCELLED
            # 这是为了应对 on_cancellation handler 不触发的情况
            if cancelled_count > 0 and flow_run_ids:
                try:
                    from apps.scan.tasks.monitor_cancellation_task import monitor_cancellation_task
                    
                    # 使用 .submit() 在后台运行，不阻塞当前请求
                    monitor_cancellation_task.submit(
                        scan_id=scan_id,
                        flow_run_id=flow_run_ids[0],  # 监控第一个 Flow Run
                        timeout_seconds=300  # 5 分钟超时
                    )
                    
                    logger.info(
                        "🔍 已启动监控任务（兜底保障，5 分钟超时）- Scan ID: %s, Flow Run: %s",
                        scan_id, flow_run_ids[0]
                    )
                except Exception as e:
                    # 监控任务启动失败不影响主流程
                    logger.warning(
                        "⚠️ 启动监控任务失败（不影响取消操作）- Scan ID: %s, 错误: %s",
                        scan_id, e
                    )
            
            return True, cancelled_count
            
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：停止扫描失败 - Scan ID: %s", scan_id)
            raise
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False, 0


# 导出接口
__all__ = ['ScanControlService']
