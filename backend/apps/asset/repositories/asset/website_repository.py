"""
Django ORM 实现的 WebSite Repository
"""

import logging
from typing import List, Generator, Optional
from django.db import transaction

from apps.asset.models.asset_models import WebSite
from apps.asset.dtos import WebSiteDTO
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoWebSiteRepository:
    """Django ORM 实现的 WebSite Repository"""

    def bulk_upsert(self, items: List[WebSiteDTO]) -> int:
        """
        批量创建或更新 WebSite（upsert）
        
        存在则更新所有字段，不存在则创建。
        使用 Django 原生 update_conflicts。
        
        Args:
            items: WebSite DTO 列表
            
        Returns:
            int: 处理的记录数
        """
        if not items:
            return 0
        
        try:
            # 直接从 DTO 字段构建 Model
            websites = [
                WebSite(
                    target_id=item.target_id,
                    url=item.url,
                    host=item.host or '',
                    location=item.location or '',
                    title=item.title or '',
                    webserver=item.webserver or '',
                    body_preview=item.body_preview or '',
                    content_type=item.content_type or '',
                    tech=item.tech if item.tech else [],
                    status_code=item.status_code,
                    content_length=item.content_length,
                    vhost=item.vhost
                )
                for item in items
            ]
            
            with transaction.atomic():
                WebSite.objects.bulk_create(
                    websites,
                    update_conflicts=True,
                    unique_fields=['url', 'target'],
                    update_fields=[
                        'host', 'location', 'title', 'webserver',
                        'body_preview', 'content_type', 'tech',
                        'status_code', 'content_length', 'vhost'
                    ],
                    batch_size=1000
                )
            
            logger.debug(f"批量 upsert WebSite 成功: {len(items)} 条")
            return len(items)
                
        except Exception as e:
            logger.error(f"批量 upsert WebSite 失败: {e}")
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
            queryset = WebSite.objects.filter(
                target_id=target_id
            ).values_list('url', flat=True).iterator(chunk_size=batch_size)
            
            for url in queryset:
                yield url
        except Exception as e:
            logger.error(f"流式导出站点 URL 失败 - Target ID: {target_id}, 错误: {e}")
            raise

    def get_all(self):
        """获取所有网站"""
        return WebSite.objects.all().order_by('-discovered_at')

    def get_by_target(self, target_id: int):
        """获取目标下的所有网站"""
        return WebSite.objects.filter(target_id=target_id).order_by('-discovered_at')

    def count_by_target(self, target_id: int) -> int:
        """统计目标下的站点总数"""
        return WebSite.objects.filter(target_id=target_id).count()

    def get_by_url(self, url: str, target_id: int) -> Optional[int]:
        """
        根据 URL 和 target_id 查找站点 ID
        
        Args:
            url: 站点 URL
            target_id: 目标 ID
            
        Returns:
            Optional[int]: 站点 ID，如果不存在返回 None
        """
        website = WebSite.objects.filter(url=url, target_id=target_id).first()
        return website.id if website else None
