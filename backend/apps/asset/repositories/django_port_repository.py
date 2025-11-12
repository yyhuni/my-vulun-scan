"""
Django ORM 实现的 Port Repository
"""

import logging
from typing import List
from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import Port
from .port_repository import PortDTO, PortRepository

logger = logging.getLogger(__name__)


class DjangoPortRepository(PortRepository):
    """Django ORM 实现的 Port Repository"""

    def bulk_create_ignore_conflicts(self, items: List[PortDTO]) -> None:
        """
        批量创建 Port，忽略冲突
        
        Args:
            items: Port DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        if not items:
            return

        try:
            # 转换为 Django 模型对象
            port_objects = [
                Port(
                    ip_id=item.ip_id,
                    target_id=item.target_id,
                    number=item.number,
                    service_name=item.service_name
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入，忽略冲突
                Port.objects.bulk_create(
                    port_objects,
                    ignore_conflicts=True,
                    unique_fields=['ip', 'number']  # 根据唯一约束
                )

            logger.debug(f"成功处理 {len(items)} 条 Port 记录")

        except IntegrityError as e:
            logger.error(
                f"批量插入 Port 失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入 Port 失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入 Port 失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入 Port 失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise
