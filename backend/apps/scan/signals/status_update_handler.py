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

from django.db import transaction

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
    
    # 维护任务白名单
    # 这些任务不需要追踪 ScanTask，也不会更新 Scan 状态
    # 特点：独立运行、定期执行、与具体扫描任务无关
    MAINTENANCE_TASKS = {'cleanup_old_scans', 'health_check', 'stats_report'}
    
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
        logger.debug(
            "收到 task_prerun 信号 - task_id: %s, task: %s, kwargs: %s",
            task_id, task, kwargs
        )

        if not task:
            task_name = f"unknown_task_{task_id or 'no_id'}"
            logger.error("task 参数为 None，使用默认名称: %s", task_name)
        else:
            task_name = getattr(task, 'name', None)
            if not task_name:
                task_name = f"unknown_task_{task_id or 'no_id'}"
                logger.error("task.name 为空，使用默认名称: %s", task_name)
        
        # 跳过维护任务（不需要追踪）
        if task_name in self.MAINTENANCE_TASKS:
            logger.debug("维护任务，跳过追踪 - Task: %s", task_name)
            return
        
        # 安全获取 scan_id（统一从 kwargs 中获取）
        # 所有扫描任务的 scan_id 都应该是关键字参数
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.error(
                "任务没有 scan_id 参数，跳过记录 - Task: %s, Task ID: %s",
                task_name, task_id or 'N/A'
            )
            return  # 直接返回，不创建无效记录
        
        # 记录任务开始（task_id 验证由 Service 层负责）
        logger.info(
            "任务开始执行 - Task: %s, Task ID: %s, Scan ID: %s",
            task_name,
            task_id or 'N/A',
            scan_id
        )
        
        # 统一追加所有任务信息到 Scan（包括编排任务和工作任务）
        # Service 层会验证 task_id，如果无效会返回 False
        try:
            append_result = self.scan_service.append_task_to_scan(
                scan_id=scan_id,
                task_id=task_id or '',
                task_name=task_name
            )
            
            if not append_result:
                logger.debug(
                    "追加任务信息失败（可能 task_id 无效）- Task: %s, Scan ID: %s",
                    task_name, scan_id
                )
        except Exception as e:
            logger.exception(
                "追加任务信息时发生异常 - Task: %s, Scan ID: %s, Error: %s",
                task_name, scan_id, e
            )
            # 不中断信号处理流程
        
        # 所有任务都创建 ScanTask 记录
        # Service 层会验证 task_id，如果无效会返回 False
        try:
            init_result = self.task_service.initialize_task(
                scan_id=scan_id,
                task_name=task_name,
                task_id=task_id or '',
                status=ScanTaskStatus.RUNNING
            )
            
            if not init_result:
                logger.debug(
                    "创建 ScanTask 记录失败（可能 task_id 无效）- Task: %s, Scan ID: %s",
                    task_name, scan_id
                )
        except Exception as e:
            logger.exception(
                "创建 ScanTask 记录时发生异常 - Task: %s, Scan ID: %s, Error: %s",
                task_name, scan_id, e
            )
            # 不中断信号处理流程
    
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
        logger.debug(
            "收到 task_success 信号 - task_id: %s, sender: %s, result: %s, args: %s, kwargs: %s",
            task_id, sender, result, args, kwargs
        )
        
        # 安全获取 task_name
        if not sender:
            task_name = f"unknown_task_{task_id or 'no_id'}"
            logger.error("sender 参数为 None，使用默认名称: %s", task_name)
        else:
            task_name = getattr(sender, 'name', None)
            if not task_name:
                task_name = f"unknown_task_{task_id or 'no_id'}"
                logger.error("sender.name 为空，使用默认名称: %s", task_name)
        
        # 跳过维护任务（不需要更新）
        if task_name in self.MAINTENANCE_TASKS:
            logger.debug("维护任务成功，跳过追踪 - Task: %s", task_name)
            return
        
        # 从 sender.request 获取任务上下文（task_success 信号不保证有 task_id 和 kwargs）
        if not task_id and sender:
            task_id = getattr(sender.request, 'id', None)
            logger.debug("从 sender.request 获取 task_id: %s", task_id)
        
        # 从 sender.request 获取 kwargs
        if not kwargs and sender:
            kwargs = getattr(sender.request, 'kwargs', None)
            logger.debug("从 sender.request 获取 kwargs: %s", kwargs)
        
        # 安全获取 scan_id（统一从 kwargs 中获取）
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.error(
                "任务没有 scan_id 参数，跳过记录 - Task: %s, Task ID: %s",
                task_name, task_id or 'N/A'
            )
            return  # 直接返回，不创建无效记录
        
        logger.info(
            "任务执行成功 - Task: %s, Task ID: %s, Scan ID: %s",
            task_name,
            task_id or 'N/A',
            scan_id
        )
        
        # 更新 ScanTask 状态（Service 层会验证 task_id）
        try:
            self.task_service.update_task_status(
                scan_id=scan_id,
                task_name=task_name,
                task_id=task_id or '',
                status=ScanTaskStatus.SUCCESSFUL
            )
        except Exception as e:
            logger.exception(
                "更新 ScanTask 状态时发生异常 - Task: %s, Scan ID: %s, Error: %s",
                task_name, scan_id, e
            )
            # 不中断信号处理流程
        
        # 关键：跳过编排任务和收尾任务
        if task_name in self.ORCHESTRATOR_TASKS:
            logger.debug(
                "编排/收尾任务 ScanTask 已更新，跳过 Scan 更新 - Task: %s, Scan ID: %s",
                task_name, scan_id
            )
            return  # ← 不更新 Scan
        
        # 工作任务 ScanTask 已更新：不更新 Scan
        # 因为只有 finalize_scan 负责更新 Scan 的最终状态
        logger.debug("工作任务 ScanTask 已更新 - Task: %s, Scan ID: %s", task_name, scan_id)
    
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
        logger.debug(
            "收到 task_failure 信号 - task_id: %s, sender: %s, exception: %s, args: %s, kwargs: %s, einfo: %s",
            task_id, sender, exception, args, kwargs, einfo
        )
        
        # 安全获取 task_name
        if not sender:
            task_name = f"unknown_task_{task_id or 'no_id'}"
            logger.error("sender 参数为 None，使用默认名称: %s", task_name)
        else:
            task_name = getattr(sender, 'name', None)
            if not task_name:
                task_name = f"unknown_task_{task_id or 'no_id'}"
                logger.error("sender.name 为空，使用默认名称: %s", task_name)
        
        # 跳过维护任务（不需要更新）
        if task_name in self.MAINTENANCE_TASKS:
            logger.debug("维护任务失败，跳过追踪 - Task: %s", task_name)
            return
        
        # 从 sender.request 获取任务上下文（task_failure 信号不保证有 task_id 和 kwargs）
        if not task_id and sender:
            task_id = getattr(sender.request, 'id', None)
            logger.debug("从 sender.request 获取 task_id: %s", task_id)
        
        # 从 sender.request 获取 kwargs
        if not kwargs and sender:
            kwargs = getattr(sender.request, 'kwargs', None)
            logger.debug("从 sender.request 获取 kwargs: %s", kwargs)
        
        # 安全获取 scan_id（统一从 kwargs 中获取）
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.error(
                "任务没有 scan_id 参数，跳过记录 - Task: %s, Task ID: %s, 错误: %s",
                task_name, task_id or 'N/A', str(exception) if exception else 'Unknown error'
            )
            return  # 直接返回，不创建无效记录
        
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
        
        # 使用事务保护多个数据库操作，确保数据一致性
        # 1. 更新 ScanTask 状态
        # 2. 标记 Scan 为失败并撤销其他任务
        try:
            with transaction.atomic():
                # 1. 更新 ScanTask 状态（Service 层会验证 task_id）
                self.task_service.update_task_status(
                    scan_id=scan_id,
                    task_name=task_name,
                    task_id=task_id or '',
                    status=ScanTaskStatus.FAILED,
                    error_message=error_message,
                    error_traceback=error_traceback
                )
                
                # 2. 关键：标记 Scan 为失败并撤销其他正在运行的任务
                # 因为 chain 会中断，finalize 不会执行
                # 使用专门的失败处理方法，集中处理：
                #   - 更新 Scan 状态为 FAILED
                #   - 撤销同一 Scan 下所有 RUNNING 任务
                #   - 触发工作空间清理
                logger.error("任务失败，开始失败级联处理 - Scan ID: %s", scan_id)
                self.scan_service.fail_scan_with_cascade(
                    scan_id=scan_id,
                    failed_task_id=task_id
                )
        except Exception as e:
            logger.exception(
                "更新任务失败状态时发生异常 - Task: %s, Scan ID: %s, Error: %s",
                task_name, scan_id, e
            )
            # 不中断信号处理流程，但数据库操作已回滚
    
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
        logger.debug(
            "收到 task_revoked 信号 - sender: %s, request: %s, terminated: %s, signum: %s, expired: %s",
            sender, request, terminated, signum, expired
        )
        
        # 从 request 对象获取信息
        if not request:
            logger.error("任务撤销信号没有 request 对象，无法追踪，跳过记录")
            return  # 直接返回，不创建无效记录
        else:
            # 安全获取 task_id
            task_id = getattr(request, 'id', None)
            if not task_id:
                task_id = 'unknown_revoked_task'
                logger.warning("request.id 为空，使用默认值: %s", task_id)
            
            # 安全获取 kwargs
            kwargs = getattr(request, 'kwargs', {})
            if not isinstance(kwargs, dict):
                logger.warning("request.kwargs 不是字典类型，使用空字典")
                kwargs = {}
            
            # 安全获取 task_name，使用默认值确保任务能被追踪
            task_name = getattr(request, 'task', None)
            if not task_name:
                task_name = f"unknown_revoked_{task_id}"
                logger.error(
                    "request.task 为空，使用默认名称: %s",
                    task_name
                )
            
            # 安全获取 scan_id
            scan_id = kwargs.get('scan_id') if kwargs else None
            if not scan_id:
                logger.error(
                    "任务没有 scan_id 参数，跳过记录 - Task: %s, Task ID: %s",
                    task_name, task_id
                )
                return  # 直接返回，不创建无效记录
        
        reason = f"Terminated={terminated}, Signal={signum}, Expired={expired}"
        logger.warning(
            "任务被中止 - Task: %s, Task ID: %s, Scan ID: %s, 原因: %s",
            task_name,
            task_id or 'N/A',
            scan_id,
            reason
        )
        
        # 使用事务保护多个数据库操作，确保数据一致性
        # 1. 更新 ScanTask 状态
        # 2. 处理 Scan 撤销状态
        try:
            with transaction.atomic():
                # 1. 更新 ScanTask 状态（Service 层会验证 task_id）
                self.task_service.update_task_status(
                    scan_id=scan_id,
                    task_name=task_name,
                    task_id=task_id or '',
                    status=ScanTaskStatus.ABORTED,
                    error_message=f"任务被中止: {reason}"
                )
                
                # 2. 处理任务被撤销的 Scan 状态更新
                # 因为 chain 会中断，finalize 不会执行
                # 使用专门的方法，包含级联撤销保护逻辑
                logger.warning("任务中止，处理 Scan 撤销状态 - Scan ID: %s", scan_id)
                self.scan_service.abort_scan_on_revoked(scan_id)
        except Exception as e:
            logger.exception(
                "更新任务撤销状态时发生异常 - Task: %s, Scan ID: %s, Error: %s",
                task_name, scan_id, e
            )
            # 不中断信号处理流程，但数据库操作已回滚
    

