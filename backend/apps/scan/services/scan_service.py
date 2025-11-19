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
from asgiref.sync import async_to_sync

from apps.scan.models import Scan
from apps.scan.repositories import DjangoScanRepository
from apps.targets.repositories import DjangoTargetRepository, DjangoOrganizationRepository
from apps.engine.repositories import DjangoEngineRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.scan.flows import initiate_scan_flow, delete_scans_flow  # 从 flows 导入
from apps.common.definitions import ScanStatus

logger = logging.getLogger(__name__)


async def _submit_flow_deployment_async(deployment_name: str, parameters: Dict) -> str:
    """
    使用 Prefect 3.x Client API 提交 Flow Run（异步版本）
    
    Args:
        deployment_name: Deployment 完整名称（格式: flow_name/deployment_name）
        parameters: Flow 参数
    
    Returns:
        Flow Run ID
    
    Raises:
        Exception: 提交失败
    
    Note:
        - 这是异步函数，可以在异步上下文中直接 await
        - 在同步上下文中使用 _submit_flow_deployment() 包装函数
    """
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


def _submit_flow_deployment(deployment_name: str, parameters: Dict) -> str:
    """
    同步包装函数：在同步上下文中提交 Flow Run
    
    使用 async_to_sync 而不是 asyncio.run，避免 ASGI 环境中的事件循环冲突。
    
    Args:
        deployment_name: Deployment 完整名称
        parameters: Flow 参数
    
    Returns:
        Flow Run ID
    
    Note:
        - 使用 async_to_sync 确保 ASGI 兼容性
        - 如果当前有事件循环，会在新线程中执行
        - 如果没有事件循环，直接在当前线程执行
    """
    return async_to_sync(_submit_flow_deployment_async)(deployment_name, parameters)


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
        scan_repository = None,
        target_repository = None,
        organization_repository = None,
        engine_repository = None
    ):
        """
        初始化服务
        
        Args:
            scan_repository: Scan Repository 实例（用于依赖注入）
            target_repository: Target Repository 实例（用于依赖注入）
            organization_repository: Organization Repository 实例（用于依赖注入）
            engine_repository: Engine Repository 实例（用于依赖注入）
        """
        self.scan_repo = scan_repository or DjangoScanRepository()
        self.target_repo = target_repository or DjangoTargetRepository()
        self.organization_repo = organization_repository or DjangoOrganizationRepository()
        self.engine_repo = engine_repository or DjangoEngineRepository()
    
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
        # 1. 参数验证
        if not engine_id:
            raise ValidationError('缺少必填参数: engine_id')
        
        if not organization_id and not target_id:
            raise ValidationError('必须提供 organization_id 或 target_id 其中之一')
        
        if organization_id and target_id:
            raise ValidationError('organization_id 和 target_id 只能提供其中之一')
        
        # 2. 查询扫描引擎（通过 Repository 层）
        engine = self.engine_repo.get_by_id(engine_id)
        if not engine:
            logger.error("扫描引擎不存在 - Engine ID: %s", engine_id)
            raise ObjectDoesNotExist(f'ScanEngine ID {engine_id} 不存在')
        
        # 3. 根据参数获取目标列表
        targets = []
        
        if organization_id:
            # 根据组织ID获取所有目标（通过 Repository 层）
            organization = self.organization_repo.get_by_id(organization_id)
            if not organization:
                logger.error("组织不存在 - Organization ID: %s", organization_id)
                raise ObjectDoesNotExist(f'Organization ID {organization_id} 不存在')
            
            targets = self.organization_repo.get_targets(organization_id)
            
            if not targets:
                raise ValidationError(f'组织 ID {organization_id} 下没有目标')
            
            logger.debug(
                "准备发起扫描 - 组织: %s, 目标数量: %d, 引擎: %s",
                organization.name,
                len(targets),
                engine.name
            )
        else:
            # 根据目标ID获取单个目标（通过 Repository 层）
            target = self.target_repo.get_by_id(target_id)
            if not target:
                logger.error("目标不存在 - Target ID: %s", target_id)
                raise ObjectDoesNotExist(f'Target ID {target_id} 不存在')
            
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
        stopped_at: datetime | None = None
    ) -> bool:
        """
        更新 Scan 状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            error_message: 错误消息（可选）
            stopped_at: 结束时间（可选）
        
        Returns:
            是否更新成功
        
        Note:
            created_at 是自动设置的，不需要手动传递
        """
        try:
            result = self.scan_repo.update_status(
                scan_id, 
                status, 
                error_message,
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
    
    def update_status_if_match(
        self,
        scan_id: int,
        current_status: ScanStatus,
        new_status: ScanStatus,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        条件更新 Scan 状态（原子操作）
        
        仅当扫描状态匹配 current_status 时才更新为 new_status。
        这是一个原子操作，用于处理并发场景下的状态更新。
        
        Args:
            scan_id: 扫描任务 ID
            current_status: 当前期望的状态
            new_status: 要更新到的新状态
            stopped_at: 结束时间（可选）
        
        Returns:
            是否更新成功（True=更新了记录，False=未更新或状态不匹配）
        
        Note:
            此方法通过 Repository 层执行原子操作，适用于需要条件更新的场景
        """
        try:
            result = self.scan_repo.update_status_if_match(
                scan_id=scan_id,
                current_status=current_status,
                new_status=new_status,
                stopped_at=stopped_at
            )
            if result:
                logger.debug(
                    "条件更新 Scan 状态成功 - Scan ID: %s, %s → %s",
                    scan_id,
                    current_status.value,
                    new_status.value
                )
            return result
        except (DatabaseError, OperationalError) as e:
            logger.exception(
                "数据库错误：条件更新 Scan 状态失败 - Scan ID: %s",
                scan_id
            )
            raise
        except Exception as e:
            logger.error(
                "条件更新 Scan 状态失败 - Scan ID: %s, 错误: %s",
                scan_id,
                e
            )
            return False
    
    def update_cached_stats(self, scan_id: int) -> bool:
        """
        更新扫描任务的缓存统计数据
        
        使用 Repository 层进行数据访问，符合分层架构规范
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否更新成功
        
        Note:
            应该在扫描进入终态时调用，更新缓存的统计字段以提升查询性能
        """
        try:
            # 通过 Repository 层更新统计数据
            result = self.scan_repo.update_cached_stats(scan_id)
            if result:
                logger.debug("更新缓存统计数据成功 - Scan ID: %s", scan_id)
            return result
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：更新缓存统计数据失败 - Scan ID: %s", scan_id)
            return False
        except Exception as e:
            logger.error("更新缓存统计数据失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
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
                deployment_name="delete-scans/delete-scans",
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

    def bulk_delete(self, scan_ids: List[int]) -> tuple[int, str]:
        """
        批量删除扫描任务（兼容旧接口，推荐使用 delete_scans_two_phase）
        
        Args:
            scan_ids: 扫描任务 ID 列表
        
        Returns:
            (删除数量, 消息)
        """
        # 转发到两阶段删除
        try:
            result = self.delete_scans_two_phase(scan_ids)
            return result['soft_deleted_count'], f"已删除 {result['soft_deleted_count']} 个扫描记录"
        except ValueError:
             return 0, "未找到要删除的记录"
        except Exception as e:
            logger.exception("批量删除失败")
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
__all__ = ['ScanService']
