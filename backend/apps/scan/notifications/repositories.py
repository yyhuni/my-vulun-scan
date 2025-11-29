import logging
from django.utils import timezone

from apps.common.decorators import auto_ensure_db_connection
from .models import Notification


logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoNotificationRepository:
    def get_filtered(self, level: str | None = None, unread: bool | None = None):
        queryset = Notification.objects.all()

        if level:
            queryset = queryset.filter(level=level)

        if unread is True:
            queryset = queryset.filter(is_read=False)
        elif unread is False:
            queryset = queryset.filter(is_read=True)

        return queryset.order_by("-created_at")

    def get_unread_count(self) -> int:
        return Notification.objects.filter(is_read=False).count()

    def mark_all_as_read(self) -> int:
        updated = Notification.objects.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return updated

    def create(self, title: str, message: str, level: str) -> Notification:
        return Notification.objects.create(
            level=level,
            title=title,
            message=message,
        )
