"""
扫描任务服务

负责 Scan 模型的所有业务逻辑
"""

import logging
import os
import uuid
from typing import Dict, List, Optional, TYPE_CHECKING
from datetime import datetime
from pathlib import Path

from celery import current_app
from django.db import transaction
from django.utils import timezone

from apps.scan.models import Scan
from apps.scan.repositories import ScanRepository
from apps.targets.models import Target
from apps.engine.models import ScanEngine
from apps.scan.tasks.initiate_scan_task import initiate_scan_task
from apps.common.definitions import ScanTaskStatus

if TYPE_CHECKING:
    from apps.scan.services.scan_task_service import ScanTaskService

logger = logging.getLogger(__name__)


class ScanService:
    """
    扫描任务服务
    
    负责 Scan 模型的所有业务逻辑，包括：
    - 创建和查询
    - 状态管理
    - 生命周期管理
    """
    
    def __init__(
        self, 
        scan_repository: ScanRepository | None = None,
        task_service: Optional['ScanTaskService'] = None
    ):
        """
        初始化服务
        
        Args:
            scan_repository: ScanRepository 实例（用于依赖注入）
            task_service: ScanTaskService 实例（用于检查任务完成状态）
        """
        self.scan_repo = scan_repository or ScanRepository()
        self._task_service = task_service
    
    @property
    def task_service(self) -> 'ScanTaskService':
        """延迟加载 ScanTaskService（避免循环导入）"""
        if self._task_service is None:
            from apps.scan.services.scan_task_service import ScanTaskService
            self._task_service = ScanTaskService()
        return self._task_service
    
    def get_scan(self, scan_id: int, prefetch_relations: bool ) -> Scan | None:
        """
        获取扫描任务（包含关联对象）
        
        自动预加载 engine 和 target，避免 N+1 查询问题
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            Scan 对象（包含 engine 和 target）或 None
        """
        return self.scan_repo.get_by_id(scan_id, prefetch_relations)
    
    def get_scan_workspace(self, scan_id: int) -> str | None:
        """
        获取扫描工作空间路径
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            工作空间路径或 None
        """
        # 这里不需要预加载关联对象，只获取 results_dir 字段
        scan = self.scan_repo.get_by_id(scan_id)
        if scan:
            return scan.results_dir
        return None
    
    def _generate_workspace_path(self) -> str:
        """
        生成工作空间目录路径
        
        职责：
        - 生成唯一的工作空间目录路径字符串
        - 不创建实际目录（由 task 层负责）
        
        Returns:
            工作空间目录路径字符串
        
        格式：{SCAN_RESULTS_DIR}/scan_{timestamp}_{unique_id}/
        示例：/data/scans/scan_20231104_152030_a1b2c3d4/
        
        Note:
            使用 UUID 后缀确保路径唯一性，避免高并发场景下的路径冲突
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]  # 添加 8 位唯一标识
        base_dir = os.getenv('SCAN_RESULTS_DIR')
        workspace_path = str(Path(base_dir) / f"scan_{timestamp}_{unique_id}")
        return workspace_path
    
    def create_scans_for_targets(
        self,
        targets: List[Target],
        engine: ScanEngine
    ) -> List[Scan]:
        """
        为多个目标批量创建扫描任务并自动启动（优化版）
        
        Args:
            targets: 目标列表
            engine: 扫描引擎对象
        
        Returns:
            创建的 Scan 对象列表
        
        性能优化：
            1. 使用 bulk_create 批量插入数据库（避免 N+1 问题）
            2. 使用事务保护批量操作（确保原子性）
            3. 预先生成所有数据，减少数据库交互次数

        
        Note:
            - Celery 任务仍然串行提交，未来可考虑使用 celery.group 批量提交
            - started_at 记录的是任务实际开始时间，由信号处理器在首个任务开始时设置
        """
        # 第一步：准备批量创建的数据
        scans_to_create = []
        
        for target in targets:
            try:
                results_dir = self._generate_workspace_path()
                scan = Scan(
                    target=target,
                    engine=engine,
                    results_dir=results_dir,
                    status=ScanTaskStatus.INITIATED,  # 显式设置初始状态
                    task_ids=[],  # 显式初始化为空列表
                )
                scans_to_create.append(scan)
            except Exception as e:
                logger.error(
                    "准备扫描任务数据失败 - Target: %s, Engine: %s, 错误: %s",
                    target.name,
                    engine.name,
                    e,
                    exc_info=True
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
        except Exception as e:
            logger.error(
                "批量创建扫描任务记录失败 - 错误: %s",
                e,
                exc_info=True
            )
            return []
        
        # 第三步：提交 Celery 任务
        # TODO: 未来可优化为 celery.group 批量提交，进一步提升性能
        successful_scans = []
        failed_count = 0
        
        for scan in created_scans:
            try:
                result = initiate_scan_task.delay(scan_id=scan.id)
                successful_scans.append(scan)
                logger.info(
                    "扫描任务已提交 - Scan ID: %s, Task ID: %s",
                    scan.id,
                    result.id
                )
            except Exception as e:
                failed_count += 1
                logger.error(
                    "提交扫描任务失败 - Scan ID: %s, 错误: %s",
                    scan.id,
                    e,
                    exc_info=True
                )
                # 标记为失败状态
                try:
                    self.scan_repo.update_status(
                        scan.id,
                        ScanTaskStatus.FAILED,
                        error_message='提交 Celery 任务失败'
                    )
                except Exception as save_error:
                    logger.error(
                        "更新扫描任务状态失败 - Scan ID: %s, 错误: %s",
                        scan.id,
                        save_error,
                        exc_info=True
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
        status: ScanTaskStatus, 
        message: Optional[str] = None
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
                logger.info(
                    "更新 Scan 状态成功 - Scan ID: %s, 状态: %s", 
                    scan_id, 
                    ScanTaskStatus(status).label
                )
            return result
        except Exception as e:  # noqa: BLE001
            logger.exception("更新 Scan 状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def start_scan_execution(
        self,
        scan_id: int
    ) -> bool:
        """
        启动扫描执行（由 initiate_scan_task 调用）
        
        职责：
        - 验证扫描状态必须是 INITIATED
        - 更新状态为 RUNNING
        - 设置开始时间
        
        注意：
        - 任务信息（task_ids, task_names）由信号处理器统一追加
        - 不再需要传递 task_id 和 task_name
        
        前置条件：
        - Scan 状态必须是 INITIATED（由 Service 层创建时设置）
        - 只能由 initiate_scan_task 调用一次
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否启动成功
        """
        try:
            # 获取当前扫描状态（不需要关联对象）
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.error("Scan 不存在 - Scan ID: %s", scan_id)
                return False
            
            # 验证状态：必须是 INITIATED
            if scan.status != ScanTaskStatus.INITIATED:
                logger.error(
                    "Scan 状态异常 - 期望 INITIATED，实际 %s, Scan ID: %s",
                    ScanTaskStatus(scan.status).label,
                    scan_id
                )
                return False
            
            # 启动扫描：INITIATED → RUNNING
            # Service 层只负责状态转换，任务信息由信号处理器追加
            scan.status = ScanTaskStatus.RUNNING
            scan.started_at = timezone.now()
            scan.save()
            
            logger.info(
                "启动扫描执行 - Scan ID: %s, 状态: %s → %s",
                scan_id,
                ScanTaskStatus.INITIATED.label,
                ScanTaskStatus.RUNNING.label
            )
            
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception("启动扫描执行失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def get_scan_completion_status(self, scan_id: int) -> tuple[bool, Dict[str, int], Optional[ScanTaskStatus]]:
        """
        获取扫描完成状态和建议的最终状态
        
        职责：
        - 查询所有子任务的完成状态
        - 提供状态统计信息
        - **不做决策**，由调用方决定如何处理
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            (是否全部完成, 状态统计, 建议的最终状态)
            - 是否全部完成: bool
            - 状态统计: {'total': x, 'successful': x, 'failed': x, 'aborted': x, 'running': x}
            - 建议的最终状态: SUCCESSFUL/FAILED/ABORTED/None (None 表示未完成)
        """
        try:
            # 检查任务完成状态
            all_completed, stats = self.task_service.check_all_tasks_completed(scan_id)
            
            if not stats.get('total', 0):
                logger.debug("Scan %s 没有子任务记录", scan_id)
                return False, stats, None
            
            if not all_completed:
                logger.debug("Scan %s 还有 %d 个任务在执行中", scan_id, stats.get('running', 0))
                return False, stats, None
            
            # 根据统计信息计算建议的最终状态
            aborted_count = stats.get('aborted', 0)
            failed_count = stats.get('failed', 0)
            
            if aborted_count > 0:
                suggested_status = ScanTaskStatus.ABORTED
            elif failed_count > 0:
                suggested_status = ScanTaskStatus.FAILED
            else:
                suggested_status = ScanTaskStatus.SUCCESSFUL
            
            return True, stats, suggested_status
                
        except Exception as e:  # noqa: BLE001
            logger.exception("获取扫描完成状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False, {'total': 0}, None
    
    def complete_scan(self, scan_id: int, status: ScanTaskStatus) -> bool:
        """
        完成扫描（正常收尾流程）
        
        职责：
        - 更新扫描状态
        - 触发工作空间清理
        
        Args:
            scan_id: 扫描任务 ID
            status: 最终状态（来自 finalize_scan 的任务统计）
        
        Returns:
            是否完成成功
        
        Note:
            此方法专门用于 finalize_scan_task 的正常收尾流程
            任务撤销场景请使用 abort_scan_on_revoked()
        """
        try:
            # 更新状态
            result = self.update_status(scan_id, status)
            if not result:
                return False
            
            # 触发清理
            self._trigger_workspace_cleanup(scan_id)
            
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception("完成扫描失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def abort_scan_on_revoked(self, scan_id: int) -> bool:
        """
        处理任务被撤销时的 Scan 状态更新
        
        职责：
        - 检查当前状态（保护 FAILED 不被覆盖）
        - 更新为 ABORTED（如果适用）
        - 触发工作空间清理
        
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
            
            # 状态保护：FAILED 优先级高于 ABORTED
            # 场景：任务失败 → Scan=FAILED → 级联撤销其他任务 → 不应该变成 ABORTED
            if scan.status == ScanTaskStatus.FAILED:
                logger.info(
                    "Scan 已处于 FAILED 状态，跳过 ABORTED 更新（级联撤销保护） - Scan ID: %s",
                    scan_id
                )
                # 虽然不更新状态，但仍然触发清理
                self._trigger_workspace_cleanup(scan_id)
                return True
            
            # 更新为 ABORTED
            result = self.update_status(scan_id, ScanTaskStatus.ABORTED)
            if not result:
                return False
            
            # 触发清理
            self._trigger_workspace_cleanup(scan_id)
            
            logger.info("✓ Scan 已更新为 ABORTED - Scan ID: %s", scan_id)
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception("处理任务撤销失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def fail_scan_with_cascade(
        self, 
        scan_id: int,
        failed_task_id: Optional[str] = None
    ) -> bool:
        """
        标记扫描为失败并撤销所有可撤销的任务
        
        职责：
        - 更新 Scan 状态为 FAILED
        - 查询并撤销同一 Scan 下所有可撤销的任务（RUNNING + PENDING）
        - 触发工作空间清理
        
        Args:
            scan_id: 扫描任务 ID
            failed_task_id: 已失败的任务 ID（用于排除，避免重复撤销）
        
        Returns:
            是否处理成功
        
        Note:
            此方法专门用于处理任务失败场景，与 complete_scan 职责分离
            
            撤销策略：
            - RUNNING 任务: 强制终止（terminate=True）
            - PENDING 任务: 取消调度（terminate=False）
            - SUCCESSFUL/FAILED/ABORTED: 不处理（保持原状态）
        """
        try:
            # 1. 立即更新 Scan 状态为 FAILED
            logger.warning("开始失败处理 - Scan ID: %s", scan_id)
            result = self.update_status(scan_id, ScanTaskStatus.FAILED)
            if not result:
                logger.error("更新 Scan 状态为 FAILED 失败 - Scan ID: %s", scan_id)
                return False
            
            # 2. 查询所有正在运行的任务
            if not self.task_service:
                logger.error("TaskService 未初始化，无法撤销任务")
                return False
            
            cancellable_tasks = self.task_service.get_running_tasks(scan_id)
            
            if not cancellable_tasks:
                logger.info("没有可撤销的任务 - Scan ID: %s", scan_id)
                # 触发清理后返回
                self._trigger_workspace_cleanup(scan_id)
                return True
            
            # 过滤掉已失败的任务（避免重复）
            tasks_to_revoke = [
                task for task in cancellable_tasks 
                if task['task_id'] != failed_task_id
            ]
            
            if not tasks_to_revoke:
                logger.info("过滤后没有需要撤销的任务 - Scan ID: %s", scan_id)
                self._trigger_workspace_cleanup(scan_id)
                return True
            
            # 3. 撤销所有可撤销的任务（RUNNING + PENDING）
            running_count = sum(1 for t in tasks_to_revoke if t.get('status') == ScanTaskStatus.RUNNING)
            pending_count = sum(1 for t in tasks_to_revoke if t.get('status') == ScanTaskStatus.PENDING)
            
            logger.warning(
                "检测到任务失败，开始撤销 %d 个任务 - Scan ID: %s (RUNNING: %d, PENDING: %d)",
                len(tasks_to_revoke), scan_id, running_count, pending_count
            )
            
            revoked_count = self._revoke_tasks(tasks_to_revoke, scan_id)
            
            logger.warning(
                "✓ 成功撤销 %d/%d 个任务 - Scan ID: %s",
                revoked_count, len(tasks_to_revoke), scan_id
            )
            
            # 4. 触发清理
            self._trigger_workspace_cleanup(scan_id)
            
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "失败处理时发生错误 - Scan ID: %s, 错误: %s",
                scan_id, e
            )
            return False
    
    def _revoke_tasks(
        self, 
        tasks: List[Dict[str, str]], 
        scan_id: int
    ) -> int:
        """
        撤销任务列表（区分 RUNNING 和 PENDING）
        
        Args:
            tasks: 任务列表 [{'task_id': 'xxx', 'task_name': 'yyy', 'status': 'RUNNING'}, ...]
            scan_id: 扫描 ID（用于日志）
        
        Returns:
            成功撤销的任务数量
        
        Note:
            - RUNNING 任务: terminate=True（强制终止正在执行的任务）
            - PENDING 任务: terminate=False（只取消调度，不发送终止信号）
        """
        app = current_app._get_current_object()
        revoked_count = 0
        
        for task in tasks:
            task_id = task['task_id']
            task_name = task['task_name']
            task_status = task.get('status', ScanTaskStatus.RUNNING)  # 默认 RUNNING
            
            try:
                # 根据状态决定是否需要终止
                # RUNNING: 需要强制终止（terminate=True）
                # PENDING: 只需取消调度（terminate=False）
                should_terminate = (task_status == ScanTaskStatus.RUNNING)
                
                app.control.revoke(
                    task_id, 
                    terminate=should_terminate,
                    signal='SIGTERM' if should_terminate else None
                )
                
                action = "已终止" if should_terminate else "已取消"
                logger.info(
                    "✓ %s任务: %s [%s] (Task ID: %s) - Scan ID: %s",
                    action, task_name, task_status, task_id, scan_id
                )
                revoked_count += 1
                
            except Exception as e:  # noqa: BLE001
                logger.error(
                    "撤销任务失败: %s [%s] (Task ID: %s) - Scan ID: %s, 错误: %s",
                    task_name, task_status, task_id, scan_id, e
                )
        
        return revoked_count
    
    def append_task_to_scan(
        self,
        scan_id: int,
        task_id: str,
        task_name: str
    ) -> bool:
        """
        追加任务信息到 Scan
        
        用于工作任务通过信号追加自己的任务 ID 和名称到 Scan 记录
        
        Args:
            scan_id: 扫描 ID
            task_id: Celery 任务 ID（不能为空）
            task_name: 任务名称
        
        Returns:
            是否追加成功
        """
        try:
            # 验证参数（业务规则）
            if not task_id or not task_id.strip():
                logger.error(
                    "task_id 为空或无效 - Scan ID: %s, Task: %s, task_id: '%s'",
                    scan_id, task_name, task_id
                )
                return False
            
            if not task_name or not task_name.strip():
                logger.error(
                    "task_name 为空或无效 - Scan ID: %s, task_id: %s",
                    scan_id, task_id
                )
                return False
            
            result = self.scan_repo.append_task(
                scan_id=scan_id,
                task_id=task_id,
                task_name=task_name
            )
            
            if result:
                logger.info(
                    "追加任务到 Scan - Scan ID: %s, Task: %s, Task ID: %s",
                    scan_id,
                    task_name,
                    task_id
                )
            
            return result
            
        except Exception as e:  # noqa: BLE001
            logger.exception("追加任务到 Scan 失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def _trigger_workspace_cleanup(self, scan_id: int) -> None:
        """
        触发工作空间清理（扫描完成后）
        
        策略：
        - 当前只记录日志，不实际清理
        - 原因：扫描结果可能需要供用户下载或后续分析
        - 未来可以：
          1. 提供手动清理 API
          2. 定时任务清理过期工作空间
          3. 根据配置决定是否自动清理
        
        Args:
            scan_id: 扫描任务 ID
        """
        try:
            scan = self.scan_repo.get_by_id(scan_id)
            if not scan:
                logger.warning("Scan %s 不存在，无法清理工作空间", scan_id)
                return
            
            workspace_dir = scan.results_dir
            
            if workspace_dir:
                logger.info(
                    "扫描完成，工作空间保留供查看 - Scan ID: %s, Path: %s",
                    scan_id,
                    workspace_dir
                )
                # TODO: 未来可以在这里调用 CleanupService.cleanup_directory(workspace_dir)
                # 或者将清理任务加入定时队列
            
        except Exception as e:  # noqa: BLE001
            logger.error("触发工作空间清理失败 - Scan ID: %s, 错误: %s", scan_id, e)


# 导出接口
__all__ = ['ScanService']
