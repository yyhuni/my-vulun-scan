"""通知系统仓储层模块"""

import logging
from dataclasses import dataclass
from typing import Optional

from django.db.models import QuerySet
from django.utils import timezone

from apps.common.decorators import auto_ensure_db_connection

from .models import Notification, NotificationSettings

logger = logging.getLogger(__name__)


@dataclass
class NotificationSettingsData:
    """通知设置更新数据"""

    discord_enabled: bool
    discord_webhook_url: str
    categories: dict[str, bool]
    wecom_enabled: bool = False
    wecom_webhook_url: str = ''


@auto_ensure_db_connection
class NotificationSettingsRepository:
    """通知设置仓储层"""

    def get_settings(self) -> NotificationSettings:
        """获取通知设置单例"""
        return NotificationSettings.get_instance()

    def update_settings(self, data: NotificationSettingsData) -> NotificationSettings:
        """更新通知设置"""
        settings = NotificationSettings.get_instance()
        settings.discord_enabled = data.discord_enabled
        settings.discord_webhook_url = data.discord_webhook_url
        settings.wecom_enabled = data.wecom_enabled
        settings.wecom_webhook_url = data.wecom_webhook_url
        settings.categories = data.categories
        settings.save()
        return settings

    def is_category_enabled(self, category: str) -> bool:
        """检查指定分类是否启用"""
        return self.get_settings().is_category_enabled(category)


@auto_ensure_db_connection
class DjangoNotificationRepository:
    """通知数据仓储层"""

    def get_filtered(
        self,
        level: Optional[str] = None,
        unread: Optional[bool] = None
    ) -> QuerySet[Notification]:
        """
        获取过滤后的通知列表

        Args:
            level: 通知级别过滤
            unread: 已读状态过滤 (True=未读, False=已读, None=全部)
        """
        queryset = Notification.objects.all()

        if level:
            queryset = queryset.filter(level=level)

        if unread is True:
            queryset = queryset.filter(is_read=False)
        elif unread is False:
            queryset = queryset.filter(is_read=True)

        return queryset.order_by("-created_at")

    def get_unread_count(self) -> int:
        """获取未读通知数量"""
        return Notification.objects.filter(is_read=False).count()

    def mark_all_as_read(self) -> int:
        """标记所有通知为已读，返回更新数量"""
        return Notification.objects.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )

    def create(
        self,
        title: str,
        message: str,
        level: str,
        category: str = 'system'
    ) -> Notification:
        """创建新通知"""
        return Notification.objects.create(
            category=category,
            level=level,
            title=title,
            message=message,
        )
