"""
状态更新处理器

负责监听任务信号并更新 Scan 和 ScanTask 的状态
"""

import logging

from apps.scan.services import ScanStatusService
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class StatusUpdateHandler:
    """状态更新处理器"""
    
    def __init__(self):
        self.status_service = ScanStatusService()
    
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
        任务开始前：初始化 Scan 信息和更新状态
        
        职责：
        - 更新 Scan 状态为 RUNNING（仅第一次）
        - 初始化或追加 task_ids 和 task_names
        - 创建 ScanTask 记录
        
        信号：task_prerun
        触发时机：任务开始执行前
        """
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        task_name = task.name if task else 'unknown'
        logger.info(
            "任务开始执行 - Task: %s, Task ID: %s, Scan ID: %s",
            task_name,
            task_id,
            scan_id
        )
        
        # 初始化扫描任务（更新状态、追加任务ID等）
        self.status_service.initialize_scan_task(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or ''
        )
        
        # 创建 ScanTask 记录
        self.status_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.RUNNING
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
        - 检查扫描是否完成
        
        信号：task_success
        触发时机：任务成功完成
        
        注意：results_dir 由 initiate_scan 创建并保存，子任务不再更新
        """
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        task_name = sender.name if sender else 'unknown'
        logger.info(
            "任务执行成功 - Task: %s, Task ID: %s, Scan ID: %s",
            task_name,
            task_id,
            scan_id
        )
        
        # 更新 ScanTask 状态
        self.status_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.SUCCESSFUL
        )
        
        # 检查扫描是否完成
        self.status_service.check_scan_completion(scan_id)
    
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
        任务失败：更新 ScanTask 状态，并检查扫描完成情况
        
        信号：task_failure
        触发时机：任务执行失败
        
        注意：不立即更新 Scan 状态为 FAILED，因为工作流中可能有多个任务。
        由 check_scan_completion() 在所有任务完成后统一判断整体状态。
        """
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        task_name = sender.name if sender else 'unknown'
        error_message = str(exception) if exception else 'Unknown error'
        error_traceback = str(einfo) if einfo else ''
        
        logger.error(
            "任务执行失败 - Task: %s, Task ID: %s, Scan ID: %s, 错误: %s",
            task_name,
            task_id,
            scan_id,
            error_message
        )
        
        # 只更新 ScanTask 状态（不更新 Scan 状态）
        self.status_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.FAILED,
            error_message=error_message,
            error_traceback=error_traceback
        )
        
        # 检查扫描是否完成（所有任务都结束后才更新 Scan 最终状态）
        self.status_service.check_scan_completion(scan_id)
    
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
        任务撤销/中止：更新 ScanTask 状态，并检查扫描完成情况
        
        信号：task_revoked
        触发时机：任务被撤销或中止
        
        注意：不立即更新 Scan 状态为 ABORTED，因为工作流中可能有多个任务。
        由 check_scan_completion() 在所有任务完成后统一判断整体状态。
        """
        # 从 request 对象获取信息
        if not request:
            logger.debug("任务撤销信号没有 request 对象")
            return
        
        task_id = request.id if hasattr(request, 'id') else None
        kwargs = request.kwargs if hasattr(request, 'kwargs') else {}
        task_name = request.task if hasattr(request, 'task') else 'unknown'
        
        scan_id = kwargs.get('scan_id') if kwargs else None
        if not scan_id:
            logger.debug("任务没有 scan_id 参数，跳过状态更新")
            return
        
        reason = f"Terminated={terminated}, Signal={signum}, Expired={expired}"
        logger.warning(
            "任务被中止 - Task: %s, Task ID: %s, Scan ID: %s, 原因: %s",
            task_name,
            task_id,
            scan_id,
            reason
        )
        
        # 只更新 ScanTask 状态（不更新 Scan 状态）
        self.status_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.ABORTED,
            error_message=f"任务被中止: {reason}"
        )
        
        # 检查扫描是否完成（所有任务都结束后才更新 Scan 最终状态）
        self.status_service.check_scan_completion(scan_id)

