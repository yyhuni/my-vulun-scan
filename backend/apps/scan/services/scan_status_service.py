"""
扫描状态管理服务

负责更新 Scan 和 ScanTask 的状态
"""

import logging
from typing import Optional

from django.db import transaction
from django.utils import timezone

from apps.scan.models import Scan, ScanTask
from apps.common.definitions import ScanTaskStatus

logger = logging.getLogger(__name__)


class ScanStatusService:
    """扫描状态管理服务"""
    
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
            with transaction.atomic():
                scan = Scan.objects.select_for_update().get(id=scan_id)  # type: ignore  # pylint: disable=no-member
                scan.status = status
                
                # 如果有错误消息，更新错误信息
                if message:
                    scan.error_message = message[:300]  # 限制长度
                
                # 如果任务完成（成功/失败/中止），更新结束时间
                if status in [
                    ScanTaskStatus.SUCCESSFUL, 
                    ScanTaskStatus.FAILED, 
                    ScanTaskStatus.ABORTED
                ]:
                    scan.stopped_at = timezone.now()
                
                scan.save()
                logger.info(
                    "更新 Scan 状态成功 - Scan ID: %s, 状态: %s", 
                    scan_id, 
                    ScanTaskStatus(status).label
                )
                return True
                
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
        except Exception as e:  # noqa: BLE001
            logger.exception("更新 Scan 状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def update_task_status(
        self,
        scan_id: int,
        task_name: str,
        task_id: str,
        status: ScanTaskStatus,
        error_message: Optional[str] = None,
        error_traceback: Optional[str] = None
    ) -> bool:
        """
        更新或创建 ScanTask 状态
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            task_id: Celery 任务 ID
            status: 任务状态
            error_message: 错误消息（可选）
            error_traceback: 错误堆栈（可选）
        
        Returns:
            是否更新成功
        """
        try:
            with transaction.atomic():
                scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
                
                # 使用 update_or_create 避免重复创建
                _scan_task, created = ScanTask.objects.update_or_create(  # type: ignore  # pylint: disable=no-member
                    scan=scan,
                    task_id=task_id,
                    defaults={
                        'name': task_name,
                        'status': status,
                        'error_message': error_message[:300] if error_message else '',
                        'error_traceback': error_traceback or '',
                    }
                )
                
                action = "创建" if created else "更新"
                logger.info(
                    "%s ScanTask - Scan ID: %s, Task: %s, 状态: %s",
                    action,
                    scan_id,
                    task_name,
                    ScanTaskStatus(status).label
                )
                return True
                
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
        except Exception as e:  # noqa: BLE001
            logger.exception(
                "更新 ScanTask 状态失败 - Scan ID: %s, Task: %s, 错误: %s",
                scan_id,
                task_name,
                e
            )
            return False
    
    def get_scan_status(self, scan_id: int) -> Optional[ScanTaskStatus]:
        """
        获取 Scan 当前状态
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            当前状态，如果不存在返回 None
        """
        try:
            scan = Scan.objects.get(id=scan_id)  # type: ignore  # pylint: disable=no-member
            return ScanTaskStatus(scan.status)
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return None
        except Exception as e:  # noqa: BLE001
            logger.exception("获取 Scan 状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return None
    
    def initialize_scan_task(
        self,
        scan_id: int,
        task_name: str,
        task_id: str
    ) -> bool:
        """
        初始化扫描任务（首个任务开始时调用）
        
        职责：
        - 更新 Scan 状态为 RUNNING（仅当状态为 INITIATED 时）
        - 初始化或追加 task_ids 和 task_names
        - 创建 ScanTask 记录
        
        Args:
            scan_id: 扫描任务 ID
            task_name: 任务名称
            task_id: Celery 任务 ID
        
        Returns:
            是否初始化成功
        """
        try:
            with transaction.atomic():
                scan = Scan.objects.select_for_update().get(id=scan_id)  # type: ignore  # pylint: disable=no-member
                
                # 只在第一个任务开始时更新状态为 RUNNING
                if scan.status == ScanTaskStatus.INITIATED:
                    scan.status = ScanTaskStatus.RUNNING
                    scan.task_ids = [task_id] if task_id else []
                    scan.task_names = [task_name]
                    scan.save()
                    logger.info("扫描开始 - Scan ID: %s, 首个任务: %s", scan_id, task_name)
                else:
                    # 追加任务 ID 和名称（如果不存在）
                    if task_id and task_id not in scan.task_ids:
                        scan.task_ids.append(task_id)
                        scan.task_names.append(task_name)
                        scan.save()
                        logger.debug("追加任务记录 - Scan ID: %s, 任务: %s", scan_id, task_name)
                
                return True
                
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
        except Exception as e:  # noqa: BLE001
            logger.exception("初始化扫描任务失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    

    def check_scan_completion(self, scan_id: int) -> bool:
        """
        检查扫描是否完成并更新最终状态
        
        逻辑：
        - 获取所有子任务
        - 检查是否所有任务都完成（成功或失败）
        - 如果所有任务都成功 → 整体成功
        - 如果有任务失败 → 整体失败
        - 如果还有任务在运行 → 保持运行状态
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否扫描已完成
        """
        try:
            # 获取所有子任务
            tasks = ScanTask.objects.filter(scan_id=scan_id)  # type: ignore  # pylint: disable=no-member
            
            if not tasks:
                logger.debug("Scan %s 没有子任务记录", scan_id)
                return False
            
            # 检查是否所有任务都完成
            all_completed = all(
                task.status in [
                    ScanTaskStatus.SUCCESSFUL,
                    ScanTaskStatus.FAILED,
                    ScanTaskStatus.ABORTED
                ]
                for task in tasks
            )
            
            if not all_completed:
                logger.debug("Scan %s 还有任务在执行中", scan_id)
                return False
            
            # 检查是否有失败的任务
            has_failed = any(
                task.status in [ScanTaskStatus.FAILED, ScanTaskStatus.ABORTED]
                for task in tasks
            )
            
            if has_failed:
                # 有失败任务 → 整体失败
                self.update_status(scan_id, ScanTaskStatus.FAILED)
                logger.warning("扫描完成但有任务失败 - Scan ID: %s", scan_id)
            else:
                # 所有任务成功 → 整体成功
                self.update_status(scan_id, ScanTaskStatus.SUCCESSFUL)
                logger.info("扫描成功完成 - Scan ID: %s", scan_id)
            
            return True
                
        except Exception as e:  # noqa: BLE001
            logger.exception("检查扫描完成状态失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False
    
    def update_scan_workflow_info(
        self,
        scan_id: int,
        task_ids: list,
        task_names: list
    ) -> bool:
        """
        更新扫描工作流信息（任务 ID 和任务名称）
        
        注意：此方法主要用于批量更新场景。在正常流程中，任务信息的更新
        由 StatusUpdateHandler 通过 task_prerun 信号自动处理，每个任务
        启动时会自动追加到 task_ids 和 task_names 列表中。
        
        仅在需要批量预更新或手动管理的场景下使用此方法。
        
        Args:
            scan_id: 扫描任务 ID
            task_ids: Celery 任务 ID 列表
            task_names: 任务名称列表
        
        Returns:
            是否更新成功
        """
        try:
            with transaction.atomic():
                scan = Scan.objects.select_for_update().get(id=scan_id)  # type: ignore  # pylint: disable=no-member
                
                # 扩展任务 ID 和名称列表
                scan.task_ids.extend(task_ids)
                scan.task_names.extend(task_names)
                scan.save()
                
                logger.info(
                    "更新工作流信息成功 - Scan ID: %s, 任务数: %d",
                    scan_id,
                    len(task_ids)
                )
                return True
                
        except Scan.DoesNotExist:  # type: ignore  # pylint: disable=no-member
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
        except Exception as e:  # noqa: BLE001
            logger.exception("更新工作流信息失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False

