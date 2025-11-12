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
    
    def prepare_initiate_scan(
        self,
        organization_id: int | None = None,
        target_id: int | None = None,
        engine_id: int | None = None
    ) -> tuple[List[Target], ScanEngine]:
        """
        准备发起扫描任务（查询和验证）
        
        负责所有数据库查询和业务验证逻辑，供视图层调用。
        
        Args:
            organization_id: 组织ID（可选）
            target_id: 目标ID（可选）
            engine_id: 扫描引擎ID（必填）
        
        Returns:
            (目标列表, 扫描引擎对象)
        
        Raises:
            ValidationError: 参数验证失败
            ObjectDoesNotExist: 资源不存在（Organization/Target/ScanEngine）
        
        Note:
            - organization_id 和 target_id 必须二选一
            - 如果提供 organization_id，返回该组织下所有目标
            - 如果提供 target_id，返回单个目标列表
        """
        from apps.targets.models import Organization
        
        # 1. 参数验证
        if not engine_id:
            raise ValidationError('缺少必填参数: engine_id')
        
        if not organization_id and not target_id:
            raise ValidationError('必须提供 organization_id 或 target_id 其中之一')
        
        if organization_id and target_id:
            raise ValidationError('organization_id 和 target_id 只能提供其中之一')
        
        # 2. 查询扫描引擎
        try:
            engine = ScanEngine.objects.get(id=engine_id)  # type: ignore  # pylint: disable=no-member
        except ScanEngine.DoesNotExist as e:
            logger.error("扫描引擎不存在 - Engine ID: %s", engine_id)
            raise ObjectDoesNotExist(f'ScanEngine ID {engine_id} 不存在') from e
        
        # 3. 根据参数获取目标列表
        targets = []
        
        if organization_id:
            # 根据组织ID获取所有目标
            try:
                organization = Organization.objects.get(id=organization_id)  # type: ignore  # pylint: disable=no-member
            except Organization.DoesNotExist as e:
                logger.error("组织不存在 - Organization ID: %s", organization_id)
                raise ObjectDoesNotExist(f'Organization ID {organization_id} 不存在') from e
            
            targets = list(organization.targets.all())
            
            if not targets:
                raise ValidationError(f'组织 ID {organization_id} 下没有目标')
            
            logger.debug(
                "准备发起扫描 - 组织: %s, 目标数量: %d, 引擎: %s",
                organization.name,
                len(targets),
                engine.name
            )
        else:
            # 根据目标ID获取单个目标
            try:
                target = Target.objects.get(id=target_id)  # type: ignore  # pylint: disable=no-member
            except Target.DoesNotExist as e:
                logger.error("目标不存在 - Target ID: %s", target_id)
                raise ObjectDoesNotExist(f'Target ID {target_id} 不存在') from e
            
            targets = [target]
            
            logger.debug(
                "准备发起扫描 - 目标: %s, 引擎: %s",
                target.name,
                engine.name
            )
        
        return targets, engine
    
    def _generate_scan_workspace_dir(self) -> str:
        """
        生成 Scan 工作空间目录路径
        
        职责：
        - 生成唯一的 Scan 级别工作空间目录路径字符串
        - 不创建实际目录（由 Flow 层负责）
        
        Returns:
            Scan 工作空间目录路径字符串
        
        格式：{SCAN_RESULTS_DIR}/scan_{timestamp}_{uuid8}/
        示例：/data/scans/scan_20231104_152030_a3f2b7e9/
        
        Raises:
            ValueError: 如果 SCAN_RESULTS_DIR 未设置或为空
        
        Note:
            使用秒级时间戳 + 8 位 UUID 确保路径唯一性
            冲突概率：同一秒内创建 1000 个扫描，冲突概率 < 0.01%
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]  # 8 位十六进制UUID (4,294,967,296 种可能)
        
        # 从 settings 获取，保持配置统一
        base_dir = getattr(settings, 'SCAN_RESULTS_DIR', None)
        if not base_dir:
            error_msg = "SCAN_RESULTS_DIR 未设置，无法创建扫描工作空间"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        scan_workspace_dir = str(Path(base_dir) / f"scan_{timestamp}_{unique_id}")
        return scan_workspace_dir
    
    def create_scans(
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
                
                # 保存 flow_run_id 到数据库，供后续停止操作使用（使用仓储层以保证并发安全）
                if self.scan_repo.append_flow_run_id(scan.id, flow_run_id):
                    current_flow_ids = list(scan.flow_run_ids or [])
                    current_flow_ids.append(flow_run_id)
                    scan.flow_run_ids = current_flow_ids
                else:
                    logger.warning(
                        "追加 Flow Run ID 失败 - Scan ID: %s, Flow Run ID: %s",
                        scan.id,
                        flow_run_id
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
                        error_message='提交 Prefect 任务失败，请检查 Prefect Server 状态',
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
        error_message: str | None = None,
        started_at: datetime | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        更新 Scan 状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            error_message: 错误消息（可选）
            started_at: 开始时间（可选）
            stopped_at: 结束时间（可选）
        
        Returns:
            是否更新成功
        
        Note:
            Service 层负责业务逻辑，决定何时传递时间戳
            Repository 层只负责数据更新
        """
        try:
            result = self.scan_repo.update_status(
                scan_id, 
                status, 
                error_message,
                started_at=started_at,
                stopped_at=stopped_at
            )
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
    
    
    
    def bulk_delete(self, scan_ids: List[int]) -> tuple[int, str]:
        """
        批量删除扫描任务（级联删除关联数据）
        
        Args:
            scan_ids: 扫描任务 ID 列表
        
        Returns:
            (删除数量, 消息)
        
        Raises:
            DatabaseError: 数据库错误
            IntegrityError: 完整性约束错误
        
        Note:
            - 使用 Repository 层批量删除
            - Django ORM 会自动级联删除相关数据
            - 异常向上传播，由视图层处理
        """
        try:
            deleted_count, _ = self.scan_repo.bulk_delete(scan_ids)
            logger.info(
                "批量删除扫描任务成功 - 数量: %d, IDs: %s",
                deleted_count,
                scan_ids
            )
            return deleted_count, f"已删除 {deleted_count} 个扫描记录"
        except (DatabaseError, IntegrityError, OperationalError) as e:
            logger.exception(
                "数据库错误：批量删除扫描任务失败 - IDs: %s",
                scan_ids
            )
            raise
    
    def get_statistics(self) -> dict:
        """
        获取扫描任务统计数据
        
        Returns:
            统计数据字典
        
        Raises:
            DatabaseError: 数据库错误
        
        Note:
            使用 Repository 层的聚合查询，性能优异
        """
        try:
            statistics = self.scan_repo.get_statistics()
            logger.debug("获取扫描统计数据成功 - 总数: %d", statistics['total'])
            return statistics
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：获取扫描统计数据失败")
            raise
    
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
                    cancelled_count = asyncio.run(_cancel_flows())
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
__all__ = ['ScanService']
