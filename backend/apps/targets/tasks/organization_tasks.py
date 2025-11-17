"""
组织异步删除任务

处理组织相关的异步删除操作

架构分层：
Task → Service → Repository → Models
"""

import logging
import threading
from django.db import close_old_connections
from apps.scan.notifications.services import create_notification
from apps.scan.notifications.types import NotificationLevel
from ..services.organization_service import OrganizationService

logger = logging.getLogger(__name__)


def async_bulk_delete_organizations(organization_ids: list[int], organization_names: list[str] = None) -> None:
    """
    异步批量删除组织（带通知）
    
    Args:
        organization_ids: 组织ID列表
        organization_names: 组织名称列表（可选，用于通知显示）
    
    Note:
        - 在后台线程中执行，不阻塞HTTP响应
        - 使用 Django ORM 的 bulk delete
        - 删除组织不会删除关联的目标
        - 发送通知告知用户删除进度和结果
    """
    def _bulk_delete_organizations():
        """内部删除函数，在新线程中执行"""
        try:
            # 关闭旧的数据库连接，在新线程中创建新连接
            close_old_connections()
            
            org_count = len(organization_ids)
            logger.info("开始异步批量删除组织 - Count: %s, IDs: %s", org_count, organization_ids)
            
            # 1. 发送开始通知
            try:
                if org_count == 1:
                    org_display = organization_names[0] if organization_names else f"ID {organization_ids[0]}"
                    create_notification(
                        title="组织删除中",
                        message=f"正在删除组织：{org_display}",
                        level=NotificationLevel.LOW
                    )
                else:
                    create_notification(
                        title="批量删除组织中",
                        message=f"正在删除 {org_count} 个组织...",
                        level=NotificationLevel.LOW
                    )
            except Exception as notify_error:
                logger.warning("发送开始删除通知失败: %s", notify_error)
            
            # 2. 执行批量删除（通过 Service 层）
            organization_service = OrganizationService()
            deleted_count, deleted_details = organization_service.bulk_delete_organizations(organization_ids)
            logger.info(
                "异步批量删除组织成功 - 删除数量: %s, 请求数量: %s, 详情: %s",
                deleted_count,
                org_count,
                deleted_details
            )
            
            # 3. 发送成功通知
            try:
                if org_count == 1:
                    org_display = organization_names[0] if organization_names else f"ID {organization_ids[0]}"
                    create_notification(
                        title="组织删除成功",
                        message=f"已成功删除组织：{org_display}",
                        level=NotificationLevel.MEDIUM
                    )
                else:
                    # 计算删除的总记录数
                    total_deleted = sum(deleted_details.values()) if isinstance(deleted_details, dict) else deleted_count
                    create_notification(
                        title="批量删除成功",
                        message=f"已成功删除 {org_count} 个组织，共清理 {total_deleted} 条记录",
                        level=NotificationLevel.MEDIUM
                    )
            except Exception as notify_error:
                logger.warning("发送删除成功通知失败: %s", notify_error)
            
        except Exception as e:
            logger.exception(
                "异步批量删除组织失败 - IDs: %s, 错误: %s",
                organization_ids,
                e
            )
            
            # 4. 发送失败通知
            try:
                if org_count == 1:
                    org_display = organization_names[0] if organization_names else f"ID {organization_ids[0]}"
                    create_notification(
                        title="组织删除失败",
                        message=f"删除组织 {org_display} 时发生错误",
                        level=NotificationLevel.HIGH
                    )
                else:
                    create_notification(
                        title="批量删除失败",
                        message=f"删除 {org_count} 个组织时发生错误",
                        level=NotificationLevel.HIGH
                    )
            except Exception as notify_error:
                logger.warning("发送删除失败通知失败: %s", notify_error)
            
        finally:
            # 关闭数据库连接，避免连接泄漏
            close_old_connections()
    
    # 在后台线程中执行删除
    thread = threading.Thread(
        target=_bulk_delete_organizations,
        name=f"bulk_delete_organizations_{len(organization_ids)}",
        daemon=True
    )
    thread.start()
    logger.info(
        "已启动异步批量删除线程 - Count: %s, Thread: %s",
        len(organization_ids),
        thread.name
    )
