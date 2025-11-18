"""
目标异步删除任务

处理目标相关的异步删除操作

架构分层：
Task → Service → Repository → Models
"""

import logging
import asyncio
from asgiref.sync import sync_to_async
from ..services.target_service import TargetService

logger = logging.getLogger(__name__)


async def _async_bulk_delete_targets_impl(target_ids: list[int]) -> None:
    """
    异步批量删除目标的实现（内部函数）
    
    Args:
        target_ids: 目标ID列表
    """
    try:
        target_count = len(target_ids)
        logger.info("开始异步批量删除目标 - Count: %s, IDs: %s", target_count, target_ids)
        
        # 执行批量删除（通过 Service 层，包装为异步）
        async def _delete_targets():
            target_service = TargetService()
            return target_service.bulk_delete_targets(target_ids)
        
        deleted_count, deleted_details = await sync_to_async(_delete_targets, thread_sensitive=False)()
        logger.info(
            "异步批量删除目标成功 - 删除数量: %s, 请求数量: %s, 详情: %s",
            deleted_count,
            target_count,
            deleted_details
        )
        
    except Exception as e:
        logger.exception(
            "异步批量删除目标失败 - IDs: %s, 错误: %s",
            target_ids,
            e
        )


def async_bulk_delete_targets(target_ids: list[int]) -> None:
    """
    异步批量删除目标及其所有关联数据
    
    使用 asyncio.create_task 在后台执行删除任务，不阻塞HTTP响应。
    
    Args:
        target_ids: 目标ID列表
    
    Note:
        - 使用 ASGI 异步实现，替代 threading.Thread
        - 在事件循环中执行，不阻塞HTTP响应
        - 使用 Django ORM 的 bulk delete，性能优于逐个删除
    """
    try:
        # 创建后台任务，不等待完成
        asyncio.create_task(
            _async_bulk_delete_targets_impl(target_ids)
        )
        logger.info(
            "已启动异步批量删除任务 - Count: %s, IDs: %s",
            len(target_ids),
            target_ids
        )
    except RuntimeError:
        # 如果没有运行中的事件循环，回退到同步方式
        logger.warning(
            "未检测到事件循环，使用同步方式删除 - Count: %s",
            len(target_ids)
        )
        # 使用 sync_to_async 的反向操作：async_to_sync
        from asgiref.sync import async_to_sync
        async_to_sync(_async_bulk_delete_targets_impl)(target_ids)
