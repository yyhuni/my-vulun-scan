"""HostPortMappingSnapshot Repository - Django ORM 实现"""

import logging
from typing import List

from apps.asset.models.snapshot_models import HostPortMappingSnapshot
from apps.asset.dtos.snapshot import HostPortMappingSnapshotDTO

logger = logging.getLogger(__name__)


class DjangoHostPortMappingSnapshotRepository:
    """HostPortMappingSnapshot Repository - Django ORM 实现，负责主机端口映射快照表的数据访问"""

    def save_snapshots(self, items: List[HostPortMappingSnapshotDTO]) -> None:
        """
        保存主机端口关联快照
        
        Args:
            items: 主机端口关联快照 DTO 列表
        
        Note:
            - 保存完整的快照数据
            - 基于唯一约束 (scan + host + ip + port) 自动去重
        """
        try:
            logger.debug("准备保存主机端口关联快照 - 数量: %d", len(items))
            
            if not items:
                logger.debug("主机端口关联快照为空，跳过保存")
                return
                
            # 构建快照对象
            snapshots = []
            for item in items:
                snapshots.append(HostPortMappingSnapshot(
                    scan_id=item.scan_id,
                    host=item.host,
                    ip=item.ip,
                    port=item.port
                ))
            
            # 批量创建（忽略冲突，基于唯一约束去重）
            HostPortMappingSnapshot.objects.bulk_create(
                snapshots, 
                ignore_conflicts=True
            )
            
            logger.debug("主机端口关联快照保存成功 - 数量: %d", len(snapshots))
            
        except Exception as e:
            logger.error(
                "保存主机端口关联快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
