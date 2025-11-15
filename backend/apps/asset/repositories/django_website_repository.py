"""
Django ORM 实现的 WebSite Repository
"""

import logging
from typing import List, Generator
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
                    vhost=item.vhost,
                    created_at=item.created_at
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入或更新
                # 如果URL和子域名已存在，则更新探测字段，但不更新 scan_id（保留原始扫描任务关联）
                # 唯一约束已在模型 Meta.constraints 中定义，此处无需重复指定
                WebSite.objects.bulk_create(
                    website_objects,
                    update_conflicts=True,
                    update_fields=[
                        'location', 'title', 'webserver', 'body_preview',
                        'content_type', 'tech', 'status_code', 'content_length', 'vhost'
                    ]
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

    def get_urls_for_export(self, target_id: int, batch_size: int = 1000) -> Generator[str, None, None]:
        """
        流式导出目标下的所有站点 URL
        
        Args:
            target_id: 目标 ID  
            batch_size: 批次大小
            
        Yields:
            str: 站点 URL
        """
        try:
            # 查询目标下的站点，只选择 URL 字段，避免不必要的数据传输
            queryset = WebSite.objects.filter(
                target_id=target_id
            ).values_list('url', flat=True).iterator(chunk_size=batch_size)
            
            for url in queryset:
                yield url
                
        except Exception as e:
            logger.error(f"流式导出站点 URL 失败 - Target ID: {target_id}, 错误: {e}")
            raise

    def count_by_target(self, target_id: int) -> int:
        """
        统计目标下的站点总数
        
        Args:
            target_id: 目标 ID
            
        Returns:
            int: 站点总数
        """
        try:
            count = WebSite.objects.filter(target_id=target_id).count()
            logger.debug(f"Target {target_id} 的站点总数: {count}")
            return count
            
        except Exception as e:
            logger.error(f"统计站点数量失败 - Target ID: {target_id}, 错误: {e}")
            raise
