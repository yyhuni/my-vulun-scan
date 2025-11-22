"""HostPortMapping Repository - Django ORM 实现"""

import logging
from typing import List

from apps.asset.models.asset_models import HostPortMapping
from apps.asset.dtos.asset import HostPortMappingDTO

logger = logging.getLogger(__name__)


class DjangoHostPortMappingRepository:
    """HostPortMapping Repository - Django ORM 实现"""

    def bulk_create_ignore_conflicts(self, items: List[HostPortMappingDTO]) -> int:
        """
        批量创建主机端口关联（忽略冲突）
        
        Args:
            items: 主机端口关联 DTO 列表
        
        Returns:
            int: 实际创建的记录数（注意：ignore_conflicts 时可能为 0）
        
        Note:
            - 基于唯一约束 (target + host + ip + port) 自动去重
            - 忽略已存在的记录，不更新
        """
        try:
            logger.debug("准备批量创建主机端口关联 - 数量: %d", len(items))
            
            if not items:
                logger.debug("主机端口关联为空，跳过创建")
                return 0
                
            # 构建记录对象
            records = []
            for item in items:
                records.append(HostPortMapping(
                    target_id=item.target_id,
                    host=item.host,
                    ip=item.ip,
                    port=item.port
                ))
            
            # 批量创建（忽略冲突，基于唯一约束去重）
            created = HostPortMapping.objects.bulk_create(
                records, 
                ignore_conflicts=True
            )
            
            created_count = len(created) if created else 0
            logger.debug("主机端口关联创建完成 - 数量: %d", created_count)
            
            return created_count
            
        except Exception as e:
            logger.error(
                "批量创建主机端口关联失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
