"""
目标异步删除任务

处理目标相关的异步删除操作

架构分层：
Task → Service → Repository → Models
"""

import logging
import threading
from django.db import close_old_connections
from apps.scan.notifications.services import create_notification
from apps.scan.notifications.types import NotificationLevel
from ..services.target_service import TargetService

logger = logging.getLogger(__name__)


def async_bulk_delete_targets(target_ids: list[int], target_names: list[str] = None) -> None:
    """
    异步批量删除目标及其所有关联数据（带通知）
    
    Args:
        target_ids: 目标ID列表
        target_names: 目标名称列表（可选，用于通知显示）
    
    Note:
        - 在后台线程中执行，不阻塞HTTP响应
        - 使用 Django ORM 的 bulk delete，性能优于逐个删除
        - 适用于批量删除多个目标的场景
        - 发送通知告知用户删除进度和结果
    """
    def _bulk_delete_targets():
        """内部删除函数，在新线程中执行"""
        try:
            # 关闭旧的数据库连接，在新线程中创建新连接
            close_old_connections()
            
            target_count = len(target_ids)
            logger.info("开始异步批量删除目标 - Count: %s, IDs: %s", target_count, target_ids)
            
            # 1. 发送开始通知
            try:
                if target_count == 1:
                    target_display = target_names[0] if target_names else f"ID {target_ids[0]}"
                    create_notification(
                        title="目标删除中",
                        message=f"正在删除目标：{target_display}",
                        level=NotificationLevel.LOW
                    )
                else:
                    create_notification(
                        title="批量删除目标中",
                        message=f"正在删除 {target_count} 个目标及其关联数据...",
                        level=NotificationLevel.LOW
                    )
            except Exception as notify_error:
                logger.warning("发送开始删除通知失败: %s", notify_error)
            
            # 2. 执行批量删除（通过 Service 层）
            target_service = TargetService()
            deleted_count, deleted_details = target_service.bulk_delete_targets(target_ids)
            logger.info(
                "异步批量删除目标成功 - 删除数量: %s, 请求数量: %s, 详情: %s",
                deleted_count,
                target_count,
                deleted_details
            )
            
            # 3. 发送成功通知
            try:
                if target_count == 1:
                    target_display = target_names[0] if target_names else f"ID {target_ids[0]}"
                    create_notification(
                        title="目标删除成功",
                        message=f"已成功删除目标：{target_display}",
                        level=NotificationLevel.MEDIUM
                    )
                else:
                    # 计算删除的总记录数（包括级联删除的关联数据）
                    total_deleted = sum(deleted_details.values()) if isinstance(deleted_details, dict) else deleted_count
                    create_notification(
                        title="批量删除成功",
                        message=f"已成功删除 {target_count} 个目标，共清理 {total_deleted} 条记录",
                        level=NotificationLevel.MEDIUM
                    )
            except Exception as notify_error:
                logger.warning("发送删除成功通知失败: %s", notify_error)
            
        except Exception as e:
            logger.exception(
                "异步批量删除目标失败 - IDs: %s, 错误: %s",
                target_ids,
                e
            )
            
            # 4. 发送失败通知
            try:
                if target_count == 1:
                    target_display = target_names[0] if target_names else f"ID {target_ids[0]}"
                    create_notification(
                        title="目标删除失败",
                        message=f"删除目标 {target_display} 时发生错误",
                        level=NotificationLevel.HIGH
                    )
                else:
                    create_notification(
                        title="批量删除失败",
                        message=f"删除 {target_count} 个目标时发生错误",
                        level=NotificationLevel.HIGH
                    )
            except Exception as notify_error:
                logger.warning("发送删除失败通知失败: %s", notify_error)
            
        finally:
            # 关闭数据库连接，避免连接泄漏
            close_old_connections()
    
    # 在后台线程中执行删除
    thread = threading.Thread(
        target=_bulk_delete_targets,
        name=f"bulk_delete_targets_{len(target_ids)}",
        daemon=True
    )
    thread.start()
    logger.info(
        "已启动异步批量删除线程 - Count: %s, Thread: %s",
        len(target_ids),
        thread.name
    )
