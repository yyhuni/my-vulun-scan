"""
任务信号处理器

负责监听 Celery 任务信号并处理任务生命周期事件

主要职责：
1. 状态管理：更新 Scan 和 ScanTask 的状态
2. 记录创建：为每个任务创建 ScanTask 记录
3. 任务追踪：追加 task_ids 和 task_names 到 Scan（仅工作任务）
4. 错误处理：记录任务失败的错误信息和堆栈

信号监听：
- task_prerun: 任务开始前（创建记录、追加任务信息）
- task_success: 任务成功完成（更新 ScanTask 状态）
- task_failure: 任务执行失败（更新 Scan 和 ScanTask 状态）
- task_revoked: 任务被中止/撤销（更新 Scan 和 ScanTask 状态）
"""

import logging

from apps.scan.services import ScanService, ScanTaskService
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class StatusUpdateHandler:
    """
    状态更新处理器
    
    职责：
    - 监听 Celery 任务信号
    - 更新 Scan 状态（通过 ScanService）
    - 更新 ScanTask 状态（通过 ScanTaskService）
    
    DAG 工作流说明：
    - 编排任务和收尾任务（initiate_scan, finalize_scan）完成时不触发 Scan 更新
    - 只有 finalize_scan 负责更新 Scan 的最终状态
    - 任务失败/中止时立即更新 Scan 状态（因为 chain 会中断，finalize 不会执行）
    """
    
    # 编排任务和收尾任务
    # 这些任务成功完成时不触发 Scan 状态更新（由 finalize_scan 统一更新）
    # 但失败/中止时仍然会立即更新 Scan 状态
    ORCHESTRATOR_TASKS = {'initiate_scan', 'finalize_scan'}
    
    def __init__(self):
        self.task_service = ScanTaskService()
        self.scan_service = ScanService(task_service=self.task_service)
    
    def on_task_prerun(
        self, 
        sender=None,  # pylint: disable=unused-argument
        task_id=None, 
        task=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        **extra  # pylint: disable=unused-argument
    ):
        """
        任务开始前：创建 ScanTask 记录
        
        职责：
        - 创建 ScanTask 记录（所有任务）
        - 追加 task_ids 和 task_names 到 Scan（仅工作任务）
        
        职责分离：
        - 编排任务（initiate_scan, finalize_scan）：在任务内部显式控制 Scan 状态
        - 工作任务（subdomain_discovery 等）：通过 initialize_scan 追加任务信息
        
        信号：task_prerun
        触发时机：任务开始执行前
        """
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
            
        # 安全获取 task_name（Fail Fast：如果为空则直接跳过）
        if not task:
            logger.error(
                "严重错误：task 参数为 None！跳过状态更新 - Scan ID: %s",
                scan_id
            )
            return  # 不使用 fallback，避免污染数据
        
        task_name = getattr(task, 'name', None)
        if not task_name:
            logger.error(
                "严重错误：task.name 为空！跳过状态更新 - Scan ID: %s",
                scan_id
            )
            return  # 不使用 fallback，避免污染数据
        
        # 记录任务开始（task_id 验证由 Service 层负责）
        logger.info(
            "任务开始执行 - Task: %s, Task ID: %s, Scan ID: %s",
            task_name,
            task_id or 'N/A',
            scan_id
        )
        
        # 统一追加所有任务信息到 Scan（包括编排任务和工作任务）
        # Service 层会验证 task_id，如果无效会返回 False
        append_result = self.scan_service.append_task_to_scan(
            scan_id=scan_id,
            task_id=task_id or '',
            task_name=task_name
        )
        
        if not append_result:
            logger.warning(
                "追加任务信息失败（可能 task_id 无效）- Task: %s, Scan ID: %s",
                task_name, scan_id
            )
        
        # 所有任务都创建 ScanTask 记录
        # Service 层会验证 task_id，如果无效会返回 False
        init_result = self.task_service.initialize_task(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.RUNNING
        )
        
        if not init_result:
            logger.warning(
                "创建 ScanTask 记录失败（可能 task_id 无效）- Task: %s, Scan ID: %s",
                task_name, scan_id
            )
    
    def on_task_success(
        self, 
        sender=None, 
        result=None,  # pylint: disable=unused-argument
        task_id=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        **extra  # pylint: disable=unused-argument
    ):
        """
        任务成功：更新 ScanTask 状态
        
        职责：
        - 更新 ScanTask 状态
        - 跳过编排任务和收尾任务的 Scan 更新
        
        信号：task_success
        触发时机：任务成功完成
        
        DAG 工作流说明：
        - 编排任务（initiate_scan）和收尾任务（finalize_scan）完成时不更新 Scan
        - 只有 finalize_scan 负责更新 Scan 的最终状态
        - 工作任务完成只更新 ScanTask，不影响 Scan
        """
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        # 安全获取 task_name（Fail Fast：如果为空则直接跳过）
        if not sender:
            logger.error(
                "严重错误：sender 参数为 None！跳过状态更新 - Scan ID: %s",
                scan_id
            )
            return  # 不使用 fallback，避免污染数据
        
        task_name = getattr(sender, 'name', None)
        if not task_name:
            logger.error(
                "严重错误：sender.name 为空！跳过状态更新 - Scan ID: %s",
                scan_id
            )
            return  # 不使用 fallback，避免污染数据
        
        logger.info(
            "任务执行成功 - Task: %s, Task ID: %s, Scan ID: %s",
            task_name,
            task_id or 'N/A',
            scan_id
        )
        
        # 更新 ScanTask 状态（Service 层会验证 task_id）
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.SUCCESSFUL
        )
        
        # 关键：跳过编排任务和收尾任务
        if task_name in self.ORCHESTRATOR_TASKS:
            logger.info(
                "编排/收尾任务 ScanTask 已更新，跳过 Scan 更新 - Task: %s, Scan ID: %s",
                task_name, scan_id
            )
            return  # ← 不更新 Scan
        
        # 工作任务 ScanTask 已更新：不更新 Scan
        # 因为只有 finalize_scan 负责更新 Scan 的最终状态
        logger.info("工作任务 ScanTask 已更新 - Task: %s, Scan ID: %s", task_name, scan_id)
    
    def on_task_failure(
        self, 
        sender=None, 
        task_id=None, 
        exception=None, 
        args=None,  # pylint: disable=unused-argument
        kwargs=None, 
        einfo=None,
        **extra  # pylint: disable=unused-argument
    ):
        """
        任务失败：更新 ScanTask 状态，并立即更新 Scan 状态
        
        信号：task_failure
        触发时机：任务执行失败
        
        DAG 工作流说明：
        - 任务失败时立即更新 Scan 状态为 FAILED
        - 因为 chain 会中断，finalize_scan 不会执行
        - 需要在这里立即更新，确保 Scan 状态正确
        """
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        # 安全获取 task_name（Fail Fast：如果为空则直接跳过）
        if not sender:
            logger.error(
                "严重错误：sender 参数为 None！跳过状态更新 - Scan ID: %s",
                scan_id
            )
            return  # 不使用 fallback，避免污染数据
        
        task_name = getattr(sender, 'name', None)
        if not task_name:
            logger.error(
                "严重错误：sender.name 为空！跳过状态更新 - Scan ID: %s",
                scan_id
            )
            return  # 不使用 fallback，避免污染数据
        
        # 安全获取错误信息
        error_message = str(exception) if exception else 'Unknown error'
        error_traceback = str(einfo) if einfo else ''
        
        logger.error(
            "任务执行失败 - Task: %s, Task ID: %s, Scan ID: %s, 错误: %s",
            task_name,
            task_id or 'N/A',
            scan_id,
            error_message
        )
        
        # 1. 更新 ScanTask 状态（Service 层会验证 task_id）
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.FAILED,
            error_message=error_message,
            error_traceback=error_traceback
        )
        
        # 2. 关键：立即更新 Scan 状态
        # 因为 chain 会中断，finalize 不会执行
        logger.warning("任务失败，立即更新 Scan - Scan ID: %s", scan_id)
        self.scan_service.complete_scan(scan_id, ScanTaskStatus.FAILED)
    
    def on_task_revoked(
        self, 
        sender=None,  # pylint: disable=unused-argument
        request=None, 
        terminated=None, 
        signum=None, 
        expired=None,
        **extra  # pylint: disable=unused-argument
    ):
        """
        任务被强制中止/撤销：更新 ScanTask 状态，并立即更新 Scan 状态
        
        信号：task_revoked
        触发时机：
        - 用户主动取消任务（celery.control.revoke）
        - 任务超时被系统终止
        - Worker进程被关闭
        - 其他强制中止场景
        
        DAG 工作流说明：
        - 任务被中止时立即更新 Scan 状态为 ABORTED
        - 因为 chain 会中断，finalize_scan 不会执行
        - 需要在这里立即更新，确保 Scan 状态正确
        """
        # 从 request 对象获取信息
        if not request:
            logger.warning("任务撤销信号没有 request 对象，无法处理")
            return
        
        # 安全获取 task_id
        task_id = getattr(request, 'id', None)
        
        # 安全获取 kwargs
        kwargs = getattr(request, 'kwargs', {})
        if not isinstance(kwargs, dict):
            logger.warning("request.kwargs 不是字典类型，使用空字典")
            kwargs = {}
        
        # 安全获取 task_name（Fail Fast：如果为空则直接跳过）
        task_name = getattr(request, 'task', None)
        if not task_name:
            logger.error(
                "严重错误：request.task 为空！跳过状态更新"
            )
            return  # 不使用 fallback，避免污染数据
        
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        reason = f"Terminated={terminated}, Signal={signum}, Expired={expired}"
        logger.warning(
            "任务被中止 - Task: %s, Task ID: %s, Scan ID: %s, 原因: %s",
            task_name,
            task_id or 'N/A',
            scan_id,
            reason
        )
        
        # 1. 更新 ScanTask 状态（Service 层会验证 task_id）
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.ABORTED,
            error_message=f"任务被中止: {reason}"
        )
        
        # 2. 关键：立即更新 Scan 状态
        # 因为 chain 会中断，finalize 不会执行
        logger.warning("任务中止，立即更新 Scan - Scan ID: %s", scan_id)
        self.scan_service.complete_scan(scan_id, ScanTaskStatus.ABORTED)
    
    def _handle_scan_completion(self, scan_id: int) -> None:
        """
        处理扫描完成逻辑
        
        职责：
        - 从 Service 获取完成状态和统计信息
        - 决定是否需要更新 Scan 状态
        - 决定更新成什么状态
        - 调用 Service 执行更新
        
        这是 Handler 层的控制逻辑，Service 层只提供数据和执行操作
        """
        # 获取完成状态（Service 层只提供数据，不做决策）
        is_completed, stats, suggested_status = self.scan_service.get_scan_completion_status(scan_id)
        
        if not is_completed:
            # 还有任务在运行，不更新状态
            return
        
        if not suggested_status:
            logger.warning("无法确定 Scan 的最终状态 - Scan ID: %s", scan_id)
            return
        
        # Handler 层决定：根据统计信息更新状态
        aborted_count = stats.get('aborted', 0)
        failed_count = stats.get('failed', 0)
        success_count = stats.get('successful', 0)
        
        if suggested_status == ScanTaskStatus.ABORTED:
            logger.warning(
                "扫描被中止 - Scan ID: %s, 中止: %d, 失败: %d, 成功: %d",
                scan_id, aborted_count, failed_count, success_count
            )
        elif suggested_status == ScanTaskStatus.FAILED:
            logger.warning(
                "扫描失败 - Scan ID: %s, 失败: %d, 成功: %d",
                scan_id, failed_count, success_count
            )
        else:
            logger.info(
                "扫描成功完成 - Scan ID: %s, 成功: %d",
                scan_id, success_count
            )
        
        # 调用 Service 执行完成操作
        self.scan_service.complete_scan(scan_id, suggested_status)

