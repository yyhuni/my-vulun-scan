"""Endpoint Repository - Django ORM 实现"""

import logging
from typing import List

from apps.asset.models import Endpoint
from apps.asset.dtos.asset import EndpointDTO
from apps.common.decorators import auto_ensure_db_connection
from django.db import transaction

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoEndpointRepository:
    """端点 Repository - 负责端点表的数据访问"""
    
    def bulk_upsert(self, items: List[EndpointDTO]) -> int:
        """
        批量创建或更新端点（upsert）
        
        存在则更新所有字段，不存在则创建。
        使用 Django 原生 update_conflicts。
        
        Args:
            items: 端点 DTO 列表
            
        Returns:
            int: 处理的记录数
        """
        if not items:
            return 0
        
        try:
            # 直接从 DTO 字段构建 Model
            endpoints = [
                Endpoint(
                    target_id=item.target_id,
                    url=item.url,
                    host=item.host or '',
                    title=item.title or '',
                    status_code=item.status_code,
                    content_length=item.content_length,
                    webserver=item.webserver or '',
                    body_preview=item.body_preview or '',
                    content_type=item.content_type or '',
                    tech=item.tech if item.tech else [],
                    vhost=item.vhost,
                    location=item.location or '',
                    matched_gf_patterns=item.matched_gf_patterns if item.matched_gf_patterns else []
                )
                for item in items
            ]
            
            with transaction.atomic():
                Endpoint.objects.bulk_create(
                    endpoints,
                    update_conflicts=True,
                    unique_fields=['url', 'target'],
                    update_fields=[
                        'host', 'title', 'status_code', 'content_length',
                        'webserver', 'body_preview', 'content_type', 'tech',
                        'vhost', 'location', 'matched_gf_patterns'
                    ],
                    batch_size=1000
                )
            
            logger.debug(f"批量 upsert 端点成功: {len(items)} 条")
            return len(items)
                
        except Exception as e:
            logger.error(f"批量 upsert 端点失败: {e}")
            raise
    
    def get_all(self):
        """获取所有端点（全局查询）"""
        return Endpoint.objects.all().order_by('-discovered_at')
    
    def get_by_target(self, target_id: int):
        """
        获取目标下的所有端点
        
        Args:
            target_id: 目标 ID
            
        Returns:
            QuerySet: 端点查询集
        """
        return Endpoint.objects.filter(target_id=target_id).order_by('-discovered_at')
    
    def count_by_target(self, target_id: int) -> int:
        """
        统计目标下的端点数量
        
        Args:
            target_id: 目标 ID
            
        Returns:
            int: 端点数量
        """
        return Endpoint.objects.filter(target_id=target_id).count()
