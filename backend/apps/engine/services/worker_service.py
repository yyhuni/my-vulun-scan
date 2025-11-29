"""
WorkerNode 业务逻辑服务层（Service）

负责 Worker 节点相关的业务逻辑处理
"""

import logging
from typing import Any

from apps.engine.repositories import DjangoWorkerRepository

logger = logging.getLogger(__name__)


class WorkerService:
    """Worker 节点业务逻辑服务"""

    def __init__(self) -> None:
        """初始化服务，注入 Repository 依赖"""
        self.repo = DjangoWorkerRepository()

    # ==================== 查询 ====================

    def get_worker(self, worker_id: int):
        """根据 ID 获取 Worker 节点"""
        return self.repo.get_by_id(worker_id)

    def get_all_workers(self):
        """获取所有 Worker 节点查询集"""
        return self.repo.get_all()

    # ==================== 状态更新 ====================

    def update_heartbeat(self, worker_id: int, info: Any | None = None) -> bool:
        """更新 Worker 节点心跳和负载信息"""
        return self.repo.update_heartbeat(worker_id, info)


__all__ = ["WorkerService"]
