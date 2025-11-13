"""
Django ORM 实现的 WebSite Repository
"""

import logging
from typing import List
from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import WebSite
from .website_repository import WebSiteDTO, WebSiteRepository

logger = logging.getLogger(__name__)


class DjangoWebSiteRepository(WebSiteRepository):
    """Django ORM 实现的 WebSite Repository"""

    def bulk_create_ignore_conflicts(self, items: List[WebSiteDTO]) -> None:
        """
        批量创建 WebSite，忽略冲突
        
        Args:
            items: WebSite DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        if not items:
            return

        try:
            # 转换为 Django 模型对象
            website_objects = [
                WebSite(
                    scan_id=item.scan_id,
                    target_id=item.target_id,
                    subdomain_id=item.subdomain_id,
                    url=item.url,
                    location=item.location,
                    title=item.title,
                    webserver=item.webserver,
                    body_preview=item.body_preview,
                    content_type=item.content_type,
                    tech=item.tech,
                    status_code=item.status_code,
                    content_length=item.content_length,
                    vhost=item.vhost
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入，忽略冲突
                WebSite.objects.bulk_create(
                    website_objects,
                    ignore_conflicts=True,
                    unique_fields=['url']  # 根据URL唯一约束
                )

            logger.debug(f"成功处理 {len(items)} 条 WebSite 记录")

        except IntegrityError as e:
            logger.error(
                f"批量插入 WebSite 失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入 WebSite 失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入 WebSite 失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入 WebSite 失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise
