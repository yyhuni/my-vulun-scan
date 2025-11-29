"""
WorkerNode 数据访问层 Django ORM 实现

基于 Django ORM 的 WorkerNode Repository 实现类
"""

import logging
from typing import Any

from django.utils import timezone

from apps.engine.models import WorkerNode
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoWorkerRepository:
    """基于 Django ORM 的 WorkerNode 数据访问层实现"""

    def get_by_id(self, worker_id: int) -> WorkerNode | None:
        """根据 ID 获取 Worker 节点"""
        try:
            return WorkerNode.objects.get(id=worker_id)
        except WorkerNode.DoesNotExist:
            logger.warning("WorkerNode 不存在 - ID: %s", worker_id)
            return None

    def get_all(self):
        """获取所有 Worker 节点的查询集"""
        return WorkerNode.objects.all().order_by("-created_at")

    def update_heartbeat(self, worker_id: int, info: Any | None = None) -> bool:
        """更新 Worker 节点的心跳时间和负载信息"""
        worker = self.get_by_id(worker_id)
        if not worker:
            return False

        worker.last_seen = timezone.now()
        if info is not None:
            worker.info = info

        worker.save(update_fields=["last_seen", "info"])
        return True


__all__ = ["DjangoWorkerRepository"]
