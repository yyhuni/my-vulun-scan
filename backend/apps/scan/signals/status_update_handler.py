"""
状态更新处理器

负责监听任务信号并更新 Scan 和 ScanTask 的状态
"""

import logging

from django.utils import timezone

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
    """
    
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
        任务开始前：初始化 Scan 信息和更新状态
        
        职责：
        - 由信号处理器控制状态更新为 RUNNING（仅第一次）
        - 由信号处理器控制 started_at 时间设置（仅第一次）
        - 初始化或追加 task_ids 和 task_names
        - 创建 ScanTask 记录
        
        信号：task_prerun
        触发时机：任务开始执行前
        
        架构说明：
        - Service 层提供灵活的接口（接受 status 和 started_at 参数）
        - Signal 层控制具体的数据（传入具体的状态和时间值）
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
        
        # 初始化扫描（由信号处理器控制状态和时间）
        self.scan_service.initialize_scan(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.RUNNING,  # 由信号处理器控制状态
            started_at=timezone.now()  # 由信号处理器控制开始时间
        )
        
        # 创建 ScanTask 记录
        self.task_service.update_task_status(
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
        
        注意：results_dir 由 initiate_scan_task 创建并保存，子任务不再更新
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
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.SUCCESSFUL
        )
        
        # 检查扫描是否完成
        self.scan_service.check_scan_completion(scan_id)
    
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
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.FAILED,
            error_message=error_message,
            error_traceback=error_traceback
        )
        
        # 检查扫描是否完成（所有任务都结束后才更新 Scan 最终状态）
        self.scan_service.check_scan_completion(scan_id)
    
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
        任务被强制中止/撤销：更新 ScanTask 状态，并检查扫描完成情况
        
        信号：task_revoked
        触发时机：
        - 用户主动取消任务（celery.control.revoke）
        - 任务超时被系统终止
        - Worker进程被关闭
        - 其他强制中止场景
        
        注意：
        - 这不是任务正常完成，而是被强制终止
        - ABORTED 状态表示任务未完整执行
        - 不立即更新 Scan 状态，由 check_scan_completion() 统一判断
        - 如果有任务被中止，整个扫描会被标记为 ABORTED
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
        self.task_service.update_task_status(
            scan_id=scan_id,
            task_name=task_name,
            task_id=task_id or '',
            status=ScanTaskStatus.ABORTED,
            error_message=f"任务被中止: {reason}"
        )
        
        # 检查扫描是否完成（所有任务都结束后才更新 Scan 最终状态）
        self.scan_service.check_scan_completion(scan_id)

