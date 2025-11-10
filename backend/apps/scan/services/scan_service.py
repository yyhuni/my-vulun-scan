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
                
                # 保存 flow_run_id 到数据库，供后续停止操作使用
                scan.flow_run_ids = [flow_run_id]
                scan.save(update_fields=['flow_run_ids'])
                
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
        message: str | None = None,
        started_at: datetime | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        更新 Scan 状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            message: 错误消息（可选）
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
                message,
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
            
            # 4. 取消所有 Prefect Flow Runs（使用异步客户端）
            cancelled_count = 0
            if flow_run_ids:
                from prefect import get_client
                from uuid import UUID
                
                async def _cancel_flows():
                    """异步取消多个 Flow Run"""
                    from prefect.states import Cancelled
                    
                    count = 0
                    async with get_client() as client:
                        for flow_run_id in flow_run_ids:
                            try:
                                # Prefect 3.x: 使用 set_flow_run_state 设置为 Cancelled 状态
                                await client.set_flow_run_state(
                                    flow_run_id=UUID(flow_run_id),
                                    state=Cancelled(message="用户手动取消扫描"),
                                    force=True
                                )
                                count += 1
                                logger.debug("已取消 Flow Run: %s - Scan ID: %s", flow_run_id, scan_id)
                            except Exception as e:
                                logger.error(
                                    "取消 Flow Run 失败: %s - Scan ID: %s, Error: %s",
                                    flow_run_id, scan_id, e
                                )
                                # 继续处理其他任务
                    return count
                
                try:
                    cancelled_count = asyncio.run(_cancel_flows())
                    logger.info(
                        "已取消 %d/%d 个 Flow Run - Scan ID: %s",
                        cancelled_count, len(flow_run_ids), scan_id
                    )
                except Exception as e:
                    logger.error("连接 Prefect Server 失败: %s", e)
            else:
                logger.info("无关联 Flow Run 需要取消 - Scan ID: %s", scan_id)
            
            # 5. 手动更新状态为 CANCELLED
            # 注意：外部 API 调用 set_flow_run_state 不会触发 on_cancellation handler
            # 因此需要手动更新数据库状态
            if cancelled_count > 0:
                from django.utils import timezone
                self.update_status(
                    scan_id,
                    ScanStatus.CANCELLED,
                    message="用户手动取消扫描",
                    stopped_at=timezone.now()
                )
                logger.info(
                    "✓ 已取消扫描 - Scan ID: %s, Flow Run: %d 个，状态已更新为 CANCELLED",
                    scan_id, cancelled_count
                )
            else:
                logger.warning(
                    "未能取消任何 Flow Run - Scan ID: %s",
                    scan_id
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
