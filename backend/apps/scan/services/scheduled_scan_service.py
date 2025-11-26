"""
定时扫描任务 Service

业务逻辑层：
- 管理定时扫描任务的 CRUD
- 动态管理 Prefect Deployment（创建/更新/删除/启用/禁用）
- 计算下次执行时间
"""
import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional, Tuple
from datetime import datetime

from django.core.exceptions import ValidationError

from apps.scan.models import ScheduledScan
from apps.scan.repositories import DjangoScheduledScanRepository, ScheduledScanDTO
from apps.engine.repositories import DjangoEngineRepository
from apps.targets.services import TargetService


logger = logging.getLogger(__name__)


class ScheduledScanService:
    """
    定时扫描任务服务
    
    职责：
    - 定时扫描任务的 CRUD 操作
    - Prefect Deployment 的动态管理
    - 调度逻辑处理
    """
    
    def __init__(self):
        self.repo = DjangoScheduledScanRepository()
        self.engine_repo = DjangoEngineRepository()
        self.target_service = TargetService()
    
    # ==================== 查询方法 ====================
    
    def get_by_id(self, scheduled_scan_id: int) -> Optional[ScheduledScan]:
        """根据 ID 获取定时扫描任务"""
        return self.repo.get_by_id(scheduled_scan_id)
    
    def get_all(self, page: int = 1, page_size: int = 10) -> Tuple[List[ScheduledScan], int]:
        """分页获取所有定时扫描任务"""
        return self.repo.get_all(page, page_size)
    
    # ==================== 创建方法 ====================
    
    def create(self, dto: ScheduledScanDTO) -> ScheduledScan:
        """
        创建定时扫描任务
        
        流程：
        1. 验证参数
        2. 创建数据库记录
        3. 创建 Prefect Deployment（如果启用）
        4. 更新 deployment_id 和 next_run_time
        
        Args:
            dto: 定时扫描 DTO
        
        Returns:
            创建的 ScheduledScan 对象
        
        Raises:
            ValidationError: 参数验证失败
        """
        # 1. 验证参数
        self._validate_create_dto(dto)
        
        # 2. 创建数据库记录
        scheduled_scan = self.repo.create(dto)
        
        # 3. 如果有 cron 表达式，创建 Prefect Deployment
        if scheduled_scan.cron_expression:
            try:
                deployment_id = self._create_prefect_deployment(scheduled_scan)
                self.repo.update_deployment_id(scheduled_scan.id, deployment_id)
                scheduled_scan.deployment_id = deployment_id
                
                # 计算并更新下次执行时间
                next_run_time = self._calculate_next_run_time(scheduled_scan)
                if next_run_time:
                    self.repo.update_next_run_time(scheduled_scan.id, next_run_time)
                    scheduled_scan.next_run_time = next_run_time
                    
                logger.info(
                    "创建定时扫描 Deployment 成功 - ID: %s, Deployment: %s",
                    scheduled_scan.id,
                    deployment_id
                )
            except Exception as e:
                logger.error("创建 Prefect Deployment 失败: %s", e)
                # 不回滚数据库记录，用户可以后续手动启用
        
        return scheduled_scan
    
    def _validate_create_dto(self, dto: ScheduledScanDTO) -> None:
        """验证创建 DTO"""
        if not dto.name:
            raise ValidationError('任务名称不能为空')
        
        if not dto.engine_id:
            raise ValidationError('必须选择扫描引擎')
        
        if not self.engine_repo.get_by_id(dto.engine_id):
            raise ValidationError(f'扫描引擎 ID {dto.engine_id} 不存在')
        
        if not dto.target_ids:
            raise ValidationError('必须选择至少一个扫描目标')
        
        # 批量验证目标是否存在
        existing_count = self.target_service.count_existing_ids(dto.target_ids)
        if existing_count != len(dto.target_ids):
            raise ValidationError('部分目标 ID 不存在')
        
        # 验证 cron 表达式格式（简单校验）
        if dto.cron_expression:
            parts = dto.cron_expression.split()
            if len(parts) != 5:
                raise ValidationError('Cron 表达式格式错误，需要 5 个部分：分 时 日 月 周')
    
    # ==================== 更新方法 ====================
    
    def update(self, scheduled_scan_id: int, dto: ScheduledScanDTO) -> Optional[ScheduledScan]:
        """
        更新定时扫描任务
        
        流程：
        1. 获取现有记录
        2. 更新数据库记录
        3. 更新 Prefect Deployment
        
        Args:
            scheduled_scan_id: 定时扫描 ID
            dto: 更新的数据
        
        Returns:
            更新后的 ScheduledScan 对象
        """
        # 获取现有记录
        existing = self.repo.get_by_id(scheduled_scan_id)
        if not existing:
            return None
        
        # 更新数据库记录
        scheduled_scan = self.repo.update(scheduled_scan_id, dto)
        if not scheduled_scan:
            return None
        
        # 如果调度配置或参数变更，需要更新 Prefect Deployment
        existing_target_ids = set(existing.targets.values_list('id', flat=True))
        new_target_ids = set(dto.target_ids) if dto.target_ids else existing_target_ids
        
        deployment_changed = (
            (dto.cron_expression is not None and dto.cron_expression != existing.cron_expression) or
            (dto.is_enabled is not None and dto.is_enabled != existing.is_enabled) or
            (dto.engine_id is not None and dto.engine_id != existing.engine_id) or
            (dto.target_ids is not None and new_target_ids != existing_target_ids)
        )
        
        if deployment_changed:
            try:
                self._update_prefect_deployment(scheduled_scan)
            except Exception as e:
                logger.error("更新 Prefect Deployment 失败: %s", e)
        
        return scheduled_scan
    
    # ==================== 启用/禁用方法 ====================
    
    def toggle_enabled(self, scheduled_scan_id: int, enabled: bool) -> bool:
        """
        切换定时扫描任务的启用状态
        
        Args:
            scheduled_scan_id: 定时扫描 ID
            enabled: 是否启用
        
        Returns:
            是否成功
        """
        scheduled_scan = self.repo.get_by_id(scheduled_scan_id)
        if not scheduled_scan:
            return False
        
        # 更新数据库
        if not self.repo.toggle_enabled(scheduled_scan_id, enabled):
            return False
        
        # 更新 Prefect Deployment
        try:
            if enabled:
                # 启用：如果没有 Deployment，创建一个
                if not scheduled_scan.deployment_id:
                    deployment_id = self._create_prefect_deployment(scheduled_scan)
                    self.repo.update_deployment_id(scheduled_scan_id, deployment_id)
                else:
                    # 启用现有 Deployment 的调度
                    self._set_deployment_schedule_active(scheduled_scan.deployment_id, True)
                
                # 更新下次执行时间
                next_run_time = self._calculate_next_run_time(scheduled_scan)
                if next_run_time:
                    self.repo.update_next_run_time(scheduled_scan_id, next_run_time)
            else:
                # 禁用：暂停 Deployment 的调度
                if scheduled_scan.deployment_id:
                    self._set_deployment_schedule_active(scheduled_scan.deployment_id, False)
                
                # 清空下次执行时间
                self.repo.update_next_run_time(scheduled_scan_id, None)
            
            logger.info(
                "切换定时扫描状态 - ID: %s, Enabled: %s",
                scheduled_scan_id,
                enabled
            )
            return True
            
        except Exception as e:
            logger.error("切换 Prefect Deployment 状态失败: %s", e)
            return False
    
    def record_run(self, scheduled_scan_id: int) -> bool:
        """
        记录一次执行（增加执行次数、更新上次执行时间、计算下次执行时间）
        
        Args:
            scheduled_scan_id: 定时扫描 ID
        
        Returns:
            是否成功
        """
        # 1. 增加执行次数并更新上次执行时间
        if not self.repo.increment_run_count(scheduled_scan_id):
            return False
        
        # 2. 计算并更新下次执行时间
        scheduled_scan = self.repo.get_by_id(scheduled_scan_id)
        if scheduled_scan and scheduled_scan.cron_expression:
            next_run_time = self._calculate_next_run_time(scheduled_scan)
            if next_run_time:
                self.repo.update_next_run_time(scheduled_scan_id, next_run_time)
        
        return True
    
    # ==================== 删除方法 ====================
    
    def delete(self, scheduled_scan_id: int) -> bool:
        """
        删除定时扫描任务
        
        流程：
        1. 删除 Prefect Deployment
        2. 软删除数据库记录
        
        Args:
            scheduled_scan_id: 定时扫描 ID
        
        Returns:
            是否成功
        """
        scheduled_scan = self.repo.get_by_id(scheduled_scan_id)
        if not scheduled_scan:
            return False
        
        # 1. 删除 Prefect Deployment
        if scheduled_scan.deployment_id:
            try:
                self._delete_prefect_deployment(scheduled_scan.deployment_id)
            except Exception as e:
                logger.error("删除 Prefect Deployment 失败: %s", e)
        
        # 2. 软删除数据库记录
        return self.repo.soft_delete(scheduled_scan_id)
    
    # ==================== 手动触发执行 ====================
    
    def trigger_now(self, scheduled_scan_id: int) -> Optional[str]:
        """
        立即触发一次扫描
        
        Args:
            scheduled_scan_id: 定时扫描 ID
        
        Returns:
            Flow Run ID，失败返回 None
        """
        scheduled_scan = self.repo.get_by_id(scheduled_scan_id)
        if not scheduled_scan:
            return None
        
        try:
            flow_run_id = self._trigger_scan_now(scheduled_scan)
            
            # 增加执行次数
            self.repo.increment_run_count(scheduled_scan_id)
            
            logger.info(
                "手动触发定时扫描 - ID: %s, Flow Run ID: %s",
                scheduled_scan_id,
                flow_run_id
            )
            return flow_run_id
            
        except Exception as e:
            logger.error("手动触发扫描失败: %s", e)
            return None
    
    # ==================== Prefect Deployment 管理 ====================
    # 使用官方推荐的 flow.from_source().to_deployment().apply() 模式
    
    def _run_in_thread(self, func):
        """
        在新线程中运行函数，避免 ASGI 环境的事件循环冲突
        """
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(func)
            return future.result()
    
    def _create_prefect_deployment(self, scheduled_scan: ScheduledScan) -> str:
        """
        使用官方推荐的 to_deployment().apply() 模式创建 Deployment
        
        Args:
            scheduled_scan: 定时扫描对象
        
        Returns:
            Deployment ID
        """
        # 在同步上下文中获取所有需要的数据
        target_ids = list(scheduled_scan.targets.values_list('id', flat=True))
        cron_expr = scheduled_scan.cron_expression
        
        def create():
            from apps.scan.flows.scheduled_scan_flow import scheduled_scan_flow
            from prefect.client.schemas.schedules import CronSchedule
            
            work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
            deployment_name = f"scheduled-scan-{scheduled_scan.id}"
            
            # Flow 参数
            parameters = {
                'scheduled_scan_id': scheduled_scan.id,
                'target_ids': target_ids,
                'engine_id': scheduled_scan.engine_id,
            }
            
            # 构建调度配置
            schedules = []
            if cron_expr:
                schedules.append(CronSchedule(cron=cron_expr, timezone="Asia/Shanghai"))
            
            # 使用 scheduled_scan_flow
            deployment = scheduled_scan_flow.from_source(
                source=".",
                entrypoint="apps/scan/flows/scheduled_scan_flow.py:scheduled_scan_flow"
            ).to_deployment(
                name=deployment_name,
                work_pool_name=work_pool_name,
                schedules=schedules if schedules else None,
                parameters=parameters,
                tags=["scheduled", "scan", f"scheduled-scan-{scheduled_scan.id}"],
                description=f"定时扫描: {scheduled_scan.name}",
                paused=not scheduled_scan.is_enabled,
            )
            
            # 应用部署
            deployment_id = deployment.apply()
            return str(deployment_id)
        
        return self._run_in_thread(create)
    
    def _update_prefect_deployment(self, scheduled_scan: ScheduledScan) -> None:
        """
        使用官方推荐的模式更新 Deployment
        重新应用 deployment 来更新配置
        """
        if not scheduled_scan.deployment_id:
            return
        
        # 从数据库重新获取最新状态，确保 is_enabled 是最新的
        scheduled_scan.refresh_from_db()
        
        target_ids = list(scheduled_scan.targets.values_list('id', flat=True))
        cron_expr = scheduled_scan.cron_expression
        
        def update():
            from apps.scan.flows.scheduled_scan_flow import scheduled_scan_flow
            from prefect.client.schemas.schedules import CronSchedule
            
            work_pool_name = os.getenv('PREFECT_DEFAULT_WORK_POOL_NAME', 'development-pool')
            deployment_name = f"scheduled-scan-{scheduled_scan.id}"
            
            parameters = {
                'scheduled_scan_id': scheduled_scan.id,
                'target_ids': target_ids,
                'engine_id': scheduled_scan.engine_id,
            }
            
            # 构建调度配置
            schedules = []
            if cron_expr:
                schedules.append(CronSchedule(cron=cron_expr, timezone="Asia/Shanghai"))
            
            # 重新创建 deployment（apply 会更新现有的）
            deployment = scheduled_scan_flow.from_source(
                source=".",
                entrypoint="apps/scan/flows/scheduled_scan_flow.py:scheduled_scan_flow"
            ).to_deployment(
                name=deployment_name,
                work_pool_name=work_pool_name,
                schedules=schedules if schedules else None,
                parameters=parameters,
                tags=["scheduled", "scan", f"scheduled-scan-{scheduled_scan.id}"],
                description=f"定时扫描: {scheduled_scan.name}",
                paused=not scheduled_scan.is_enabled,
            )
            
            deployment.apply()
        
        self._run_in_thread(update)
    
    def _set_deployment_schedule_active(self, deployment_id: str, active: bool) -> None:
        """设置 Deployment 调度的启用状态"""
        def toggle():
            import asyncio
            from prefect import get_client
            from prefect.client.schemas.actions import DeploymentUpdate
            
            async def _toggle():
                update = DeploymentUpdate(paused=not active)
                async with get_client() as client:
                    await client.update_deployment(
                        deployment_id=deployment_id,
                        deployment=update,
                    )
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(_toggle())
            finally:
                loop.close()
        
        self._run_in_thread(toggle)
    
    def _delete_prefect_deployment(self, deployment_id: str) -> None:
        """删除 Prefect Deployment"""
        def delete():
            import asyncio
            from prefect import get_client
            
            async def _delete():
                async with get_client() as client:
                    try:
                        await client.delete_deployment(deployment_id)
                    except Exception as e:
                        logger.warning("删除 Deployment 失败（可能已不存在）: %s", e)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(_delete())
            finally:
                loop.close()
        
        self._run_in_thread(delete)
    
    def _trigger_scan_now(self, scheduled_scan: ScheduledScan) -> str:
        """立即触发扫描"""
        target_ids = list(scheduled_scan.targets.values_list('id', flat=True))
        
        def trigger():
            import asyncio
            from prefect import get_client
            
            async def _trigger():
                parameters = {
                    'scheduled_scan_id': scheduled_scan.id,
                    'target_ids': target_ids,
                    'engine_id': scheduled_scan.engine_id,
                }
                
                async with get_client() as client:
                    deployment = await client.read_deployment_by_name(
                        "initiate_scan/initiate-scan-on-demand"
                    )
                    flow_run = await client.create_flow_run_from_deployment(
                        deployment.id,
                        parameters=parameters
                    )
                    return str(flow_run.id)
            
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(_trigger())
            finally:
                loop.close()
        
        return self._run_in_thread(trigger)
    
    # ==================== 辅助方法 ====================
    
    def _calculate_next_run_time(self, scheduled_scan: ScheduledScan) -> Optional[datetime]:
        """
        计算下次执行时间
        
        Args:
            scheduled_scan: 定时扫描对象
        
        Returns:
            下次执行时间，once 类型返回 None
        """
        from croniter import croniter
        from django.utils import timezone
        
        cron_expr = scheduled_scan.cron_expression
        if not cron_expr:
            return None
        
        try:
            cron = croniter(cron_expr, timezone.now())
            return cron.get_next(datetime)
        except Exception as e:
            logger.error("计算下次执行时间失败: %s", e)
            return None
