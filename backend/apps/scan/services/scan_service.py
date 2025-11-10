"""
扫描任务服务

负责 Scan 模型的所有业务逻辑

使用 Prefect 3.x 进行异步任务编排
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Dict, List, TYPE_CHECKING
from datetime import datetime
from pathlib import Path
from django.conf import settings
from django.db import transaction
from django.db.utils import DatabaseError, IntegrityError, OperationalError
from django.core.exceptions import ValidationError, ObjectDoesNotExist

from apps.scan.models import Scan
from apps.scan.repositories import ScanRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.scan.flows import initiate_scan_flow  # 从 flows 导入
from apps.common.definitions import ScanStatus

logger = logging.getLogger(__name__)


def _submit_flow_deployment(deployment_name: str, parameters: Dict) -> str:
    """
    使用 Prefect 3.x Client API 提交 Flow Run（同步包装）
    
    Args:
        deployment_name: Deployment 完整名称（格式: flow_name/deployment_name）
        parameters: Flow 参数
    
    Returns:
        Flow Run ID
    
    Raises:
        Exception: 提交失败
    """
    async def _submit_async():
        from prefect import get_client
        
        async with get_client() as client:
            # 1. 读取 Deployment
            deployment = await client.read_deployment_by_name(deployment_name)
            
            # 2. 创建 Flow Run
            flow_run = await client.create_flow_run_from_deployment(
                deployment.id,
                parameters=parameters
            )
            
            return str(flow_run.id)
    
    # 在同步上下文中运行异步代码
    return asyncio.run(_submit_async())


class ScanService:
    """
    扫描任务服务
    
    负责 Scan 模型的所有业务逻辑，包括：
    - 创建和查询
    - 状态管理
    - 生命周期管理
    """
    
    # 终态集合：这些状态一旦设置，不应该被覆盖
    FINAL_STATUSES = {
        ScanStatus.COMPLETED,
        ScanStatus.FAILED,
        ScanStatus.CANCELLED
    }
    
    def __init__(
        self, 
        scan_repository: ScanRepository | None = None
    ):
        """
        初始化服务
        
        Args:
            scan_repository: ScanRepository 实例（用于依赖注入）
        """
        self.scan_repo = scan_repository or ScanRepository()
    
    def get_scan(self, scan_id: int, prefetch_relations: bool) -> Scan | None:
        """
        获取扫描任务（包含关联对象）
        
        自动预加载 engine 和 target，避免 N+1 查询问题
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            Scan 对象（包含 engine 和 target）或 None
        """
        return self.scan_repo.get_by_id(scan_id, prefetch_relations)
    
    def _generate_scan_workspace_dir(self) -> str:
        """
        生成 Scan 工作空间目录路径
        
        职责：
        - 生成唯一的 Scan 级别工作空间目录路径字符串
        - 不创建实际目录（由 Flow 层负责）
        
        Returns:
            Scan 工作空间目录路径字符串
        
        格式：{SCAN_RESULTS_DIR}/scan_{timestamp}_{uuid4}/
        示例：/data/scans/scan_20231104_152030_a3f2/
        
        Raises:
            ValueError: 如果 SCAN_RESULTS_DIR 未设置或为空
        
        Note:
            使用秒级时间戳 + 4 位 UUID 确保路径唯一性，兼顾性能、可读性和防冲突
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:4]  # 4 位十六进制UUID
        
        # 从 settings 获取，保持配置统一
        base_dir = getattr(settings, 'SCAN_RESULTS_DIR', None)
        if not base_dir:
            error_msg = "SCAN_RESULTS_DIR 未设置，无法创建扫描工作空间"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        scan_workspace_dir = str(Path(base_dir) / f"scan_{timestamp}_{unique_id}")
        return scan_workspace_dir
    
    def create_scans_for_targets(
        self,
        targets: List[Target],
        engine: ScanEngine
    ) -> List[Scan]:
        """
        为多个目标批量创建扫描任务并通过 Prefect 3.x 异步启动
        
        Args:
            targets: 目标列表
            engine: 扫描引擎对象
        
        Returns:
            创建的 Scan 对象列表
        
        性能优化：
            1. 使用 bulk_create 批量插入数据库（避免 N+1 问题）
            2. 使用事务保护批量操作（确保原子性）
            3. 使用 Prefect 3.x Client API 异步提交任务（不阻塞请求）
        
        Note:
            - 任务通过 Prefect Deployment 提交到 Server
            - Worker 异步执行，不阻塞 HTTP 请求
            - Flow 状态由 Prefect Handlers 自动管理
        """
        # 第一步：准备批量创建的数据
        scans_to_create = []
        
        for target in targets:
            try:
                # 生成 Scan 工作空间目录路径
                scan_workspace_dir = self._generate_scan_workspace_dir()
                scan = Scan(
                    target=target,
                    engine=engine,
                    results_dir=scan_workspace_dir,  # 保存到数据库字段
                    status=ScanStatus.INITIATED,  # 显式设置初始状态
                    flow_run_ids=[],  # 显式初始化为空列表
                    flow_run_names=[],  # 显式初始化为空列表
                )
                scans_to_create.append(scan)
            except (ValidationError, ValueError) as e:
                logger.error(
                    "准备扫描任务数据失败（验证错误） - Target: %s, Engine: %s, 错误: %s",
                    target.name,
                    engine.name,
                    e
                )
                # 继续处理其他目标，不中断批量操作
                continue
        
        if not scans_to_create:
            logger.warning("没有需要创建的扫描任务")
            return []
        
        # 第二步：使用事务批量创建（一次数据库操作）
        created_scans = []
        try:
            with transaction.atomic():
                created_scans = self.scan_repo.bulk_create(scans_to_create)
                logger.info(
                    "批量创建扫描任务记录成功 - 数量: %d",
                    len(created_scans)
                )
        except (DatabaseError, IntegrityError) as e:
            logger.exception(
                "数据库错误：批量创建扫描任务记录失败 - 错误: %s",
                e
            )
            return []
        except ValidationError as e:
            logger.error(
                "验证错误：扫描任务数据无效 - 错误: %s",
                e
            )
            return []
        
        # 第三步：通过 Prefect 3.x 异步提交扫描任务
        successful_scans = []
        failed_count = 0
        
        for scan in created_scans:
            try:
                # 准备 Flow 参数（Service 层负责数据准备）
                flow_kwargs = {
                    'scan_id': scan.id,
                    'target_name': scan.target.name,
                    'target_id': scan.target.id,
                    'scan_workspace_dir': scan.results_dir,  # Scan 工作空间目录
                    'engine_name': scan.engine.name,
                    'engine_config': scan.engine.configuration
                }
                
                # 使用 Prefect 3.x Client API 异步提交
                # 直接使用 Prefect Client 提交任务到 Server
                # 任务由 Worker 异步执行，不阻塞 HTTP 请求
                flow_run_id = _submit_flow_deployment(
                    deployment_name="initiate_scan/initiate-scan-on-demand",
                    parameters=flow_kwargs
                )
                
                successful_scans.append(scan)
                logger.info(
                    "✓ 异步提交扫描任务成功 - Scan ID: %s, Flow Run ID: %s",
                    scan.id,
                    flow_run_id
                )
            except Exception as e:
                failed_count += 1
                logger.error(
                    "Prefect 错误：提交扫描任务失败 - Scan ID: %s, 错误: %s",
                    scan.id,
                    e
                )
                # 标记为失败状态
                try:
                    self.scan_repo.update_status(
                        scan.id,
                        ScanStatus.FAILED,
                        error_message='提交 Prefect 任务失败'
                    )
                except (DatabaseError, OperationalError) as save_error:
                    logger.error(
                        "数据库错误：更新扫描任务状态失败 - Scan ID: %s, 错误: %s",
                        scan.id,
                        save_error
                    )
        
        logger.info(
            "批量创建扫描任务完成 - 总数: %d, 成功: %d, 失败: %d",
            len(targets),
            len(successful_scans),
            failed_count
        )
        
        return successful_scans
    
    # ==================== 状态管理方法（从 ScanStatusService 合并） ====================
    
    def update_status(
        self, 
        scan_id: int, 
        status: ScanStatus, 
        message: str | None = None
    ) -> bool:
        """
        更新 Scan 状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            message: 错误消息（可选）
        
        Returns:
            是否更新成功
        """
        try:
            result = self.scan_repo.update_status(scan_id, status, message)
            if result:
                logger.debug(
                    "更新 Scan 状态成功 - Scan ID: %s, 状态: %s", 
                    scan_id, 
                    ScanStatus(status).label
                )
            return result
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：更新 Scan 状态失败 - Scan ID: %s", scan_id)
            raise  # 数据库错误应该向上传播
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
    
    def update_scan_to_running(
        self,
        scan_id: int
    ) -> bool:
        """
        更新扫描状态为 RUNNING（已废弃）
        
        废弃原因：
        - 状态更新职责已移至 Prefect State Handlers
        - Flow 层不应该调用 Service 层更新状态
        - 通过 handlers/initiate_scan_flow_handlers.py 自动处理状态同步
        
        迁移指南：
        - 使用 Prefect State Hooks（on_running, on_completion, on_failure）
        - 不再需要手动调用此方法
        
        保留此方法仅用于向后兼容，未来版本将删除
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否更新成功
        """
        try:
            # 步骤 1: 获取当前扫描状态（业务验证）
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                return False
            
            # 步骤 2: 验证状态（业务规则）
            if scan.status != ScanStatus.INITIATED:
                logger.error(
                    "Scan 状态异常 - 期望 INITIATED，实际 %s, Scan ID: %s",
                    ScanStatus(scan.status).label,
                    scan_id
                )
                return False
            
            # 步骤 3: 委托 Repository 层进行数据更新
            result = self.scan_repo.update_status(
                scan_id=scan_id,
                status=ScanStatus.RUNNING
            )
            
            if result:
                logger.info(
                    "扫描状态已更新 - Scan ID: %s, 状态: %s → %s",
                    scan_id,
                    ScanStatus.INITIATED.label,
                    ScanStatus.RUNNING.label
                )
            else:
                logger.error(
                    "更新扫描状态失败 - Scan ID: %s（数据库操作失败）",
                    scan_id
                )
            
            return result
                
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：更新扫描状态失败 - Scan ID: %s", scan_id)
            raise  # 数据库错误应该向上传播
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
    
    
    def stop_scan(self, scan_id: int) -> tuple[bool, int]:
        """
        主动停止扫描任务（用户发起）
        
        职责：
        - 验证扫描状态（只能停止 RUNNING/INITIATED）
        - 取消所有 Prefect Flow Runs
        - 状态由 on_cancelled Handler 自动更新为 CANCELLED
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            (是否成功, 取消的 Flow Run 数量)
        
        Note:
            此方法用于 API 主动停止场景
            状态更新完全由 Prefect Handler 管理
        """
        try:
            # 1. 获取扫描对象
            scan = self.scan_repo.get_by_id(scan_id)
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
            
            # 3. 获取任务列表
            flow_run_ids = scan.flow_run_ids or []
            
            # 4. 取消所有 Prefect Flow Runs
            cancelled_count = 0
            if flow_run_ids:
                from prefect import get_client
                from uuid import UUID
                
                try:
                    client = get_client(sync_client=True)
                    
                    for flow_run_id in flow_run_ids:
                        try:
                            client.cancel_flow_run(UUID(flow_run_id))
                            cancelled_count += 1
                            logger.debug("已取消 Flow Run: %s - Scan ID: %s", flow_run_id, scan_id)
                        except Exception as e:
                            logger.error(
                                "取消 Flow Run 失败: %s - Scan ID: %s, Error: %s",
                                flow_run_id, scan_id, e
                            )
                            # 继续处理其他任务
                    
                    logger.info(
                        "已取消 %d/%d 个 Flow Run - Scan ID: %s",
                        cancelled_count, len(flow_run_ids), scan_id
                    )
                except Exception as e:
                    logger.error("连接 Prefect Server 失败: %s", e)
            else:
                logger.info("无关联 Flow Run 需要取消 - Scan ID: %s", scan_id)
            
            # 5. 状态由 on_cancelled Handler 自动更新为 CANCELLED
            
            logger.info(
                "✓ 已发送取消请求 - Scan ID: %s, Flow Run: %d 个 (状态将由 Handler 更新为 CANCELLED)",
                scan_id, cancelled_count
            )
            return True, cancelled_count
            
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：停止扫描失败 - Scan ID: %s", scan_id)
            raise
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False, 0
    
    def abort_scan_on_revoked(self, scan_id: int) -> bool:
        """
        处理任务被撤销时的 Scan 状态更新（信号触发）
        
        职责：
        - 检查当前状态（保护 FAILED 不被覆盖）
        - 更新为 ABORTED（如果适用）
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否处理成功
        
        Note:
            专门用于 on_task_revoked 信号处理
            包含状态保护逻辑，防止级联撤销覆盖 FAILED 状态
        """
        try:
            # 获取当前状态
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                return False
            
            # 状态保护：保护所有终态不被覆盖
            # 终态优先级：SUCCESSFUL = FAILED = ABORTED
            # 场景1：任务失败 → Scan=FAILED → 级联撤销其他任务 → 不应该变成 ABORTED
            # 场景2：finalize_scan → Scan=SUCCESSFUL → 延迟的 revoked 信号 → 不应该变成 ABORTED
            if scan.status in self.FINAL_STATUSES:
                logger.info(
                    "Scan 已处于终态 %s，跳过 ABORTED 更新（终态保护） - Scan ID: %s",
                    ScanStatus(scan.status).label,
                    scan_id
                )
                return True
            
            # 更新为 ABORTED
            result = self.update_status(scan_id, ScanStatus.ABORTED)
            if not result:
                return False
            
            logger.debug("Scan 已更新为 ABORTED - Scan ID: %s", scan_id)
            return True
                
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：处理任务撤销失败 - Scan ID: %s", scan_id)
            raise  # 数据库错误应该向上传播
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
    
    
    def append_task_to_scan(
        self,
        scan_id: int,
        flow_run_id: str,
        flow_run_name: str
    ) -> bool:
        """
        追加 Flow Run 信息到 Scan
        
        用于工作任务通过信号追加自己的 Flow Run ID 和名称到 Scan 记录
        
        Args:
            scan_id: 扫描 ID
            flow_run_id: Prefect Flow Run ID（不能为空）
            flow_run_name: Flow Run 名称
        
        Returns:
            是否追加成功
        """
        try:
            # 验证参数（业务规则）
            if not flow_run_id or not flow_run_id.strip():
                logger.error(
                    "flow_run_id 为空或无效 - Scan ID: %s, Flow Run: %s, flow_run_id: '%s'",
                    scan_id, flow_run_name, flow_run_id
                )
                return False
            
            if not flow_run_name or not flow_run_name.strip():
                logger.error(
                    "flow_run_name 为空或无效 - Scan ID: %s, flow_run_id: %s",
                    scan_id, flow_run_id
                )
                return False
            
            result = self.scan_repo.append_task(
                scan_id=scan_id,
                flow_run_id=flow_run_id,
                flow_run_name=flow_run_name
            )
            
            if result:
                logger.debug(
                    "追加 Flow Run 到 Scan - Scan ID: %s, Flow Run: %s, Flow Run ID: %s",
                    scan_id,
                    flow_run_name,
                    flow_run_id
                )
            
            return result
            
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：追加任务到 Scan 失败 - Scan ID: %s", scan_id)
            raise  # 数据库错误应该向上传播
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
    


# 导出接口
__all__ = ['ScanService']
