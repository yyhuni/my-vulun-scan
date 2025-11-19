"""
Django ORM 实现的 Port Repository
"""

import logging
from dataclasses import dataclass
from typing import List
from django.db import transaction, IntegrityError, OperationalError, DatabaseError
from django.utils import timezone
from typing import Tuple, Dict

from apps.asset.models import Port
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@dataclass
class PortDTO:
    """端口数据传输对象"""
    ip_address_id: int
    number: int
    subdomain_id: int = None
    service_name: str = ''
    target_id: int = None
    scan_id: int = None



@auto_ensure_db_connection
class DjangoPortRepository:
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
                    ip_address_id=item.ip_address_id,
                    subdomain_id=item.subdomain_id,
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
    
    def get_all(self):
        """
        获取所有端口
        
        Returns:
            QuerySet: 端口查询集
        """
        return Port.objects.all()
    
    def soft_delete_by_ids(self, port_ids: List[int]) -> int:
        """
        根据 ID 列表批量软删除Port
        
        Args:
            port_ids: Port ID 列表
        
        Returns:
            软删除的记录数
        """
        try:
            updated_count = (
                Port.objects
                .filter(id__in=port_ids)
                .update(deleted_at=timezone.now())
            )
            logger.debug(
                "批量软删除Port成功 - Count: %s, 更新记录: %s",
                len(port_ids),
                updated_count
            )
            return updated_count
        except Exception as e:
            logger.error(
                "批量软删除Port失败 - IDs: %s, 错误: %s",
                port_ids,
                e
            )
            raise
    
    def hard_delete_by_ids(self, port_ids: List[int]) -> Tuple[int, Dict[str, int]]:
        """
        根据 ID 列表硬删除Port（使用数据库级 CASCADE）
        
        Args:
            port_ids: Port ID 列表
        
        Returns:
            (删除的记录数, 删除详情字典)
        """
        try:
            batch_size = 1000
            total_deleted = 0
            
            logger.debug(f"开始批量删除 {len(port_ids)} 个Port（数据库 CASCADE）...")
            
            for i in range(0, len(port_ids), batch_size):
                batch_ids = port_ids[i:i + batch_size]
                count, _ = Port.all_objects.filter(id__in=batch_ids).delete()
                total_deleted += count
                logger.debug(f"批次删除完成: {len(batch_ids)} 个Port，删除 {count} 条记录")
            
            deleted_details = {
                'ports': len(port_ids),
                'total': total_deleted,
                'note': 'Database CASCADE - detailed stats unavailable'
            }
            
            logger.debug(
                "批量硬删除成功（CASCADE）- Port数: %s, 总删除记录: %s",
                len(port_ids),
                total_deleted
            )
            
            return total_deleted, deleted_details
        
        except Exception as e:
            logger.error(
                "批量硬删除失败（CASCADE）- Port数: %s, 错误: %s",
                len(port_ids),
                str(e),
                exc_info=True
            )
            raise
