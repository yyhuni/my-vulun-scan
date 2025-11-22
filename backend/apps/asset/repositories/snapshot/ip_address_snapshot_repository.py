"""Django ORM 实现的 IPAddressSnapshot Repository"""

import logging
from typing import List

from apps.asset.models.snapshot_models import IPAddressSnapshot
from apps.asset.repositories.asset.ip_address_repository import IPAddressDTO

logger = logging.getLogger(__name__)


class DjangoIPAddressSnapshotRepository:
    """IP地址快照 Repository - 负责IP地址快照表的数据访问"""

    def save_ip_snapshots(self, items: List[IPAddressDTO]) -> None:
        """
        保存IP地址快照（暂不处理关联关系）
        
        Args:
            items: IP地址 DTO 列表
        
        Note:
            - 保存完整的快照数据
            - 基于唯一约束自动去重（忽略冲突）
            - 关联关系需要在更上层的服务中处理
        """
        try:
            logger.debug("准备保存IP地址快照 - 数量: %d", len(items))
            
            if not items:
                logger.debug("IP地址快照为空，跳过保存")
                return
                
            # 构建 IP 快照对象
            ip_snapshots = []
            for item in items:
                ip_snapshots.append(IPAddressSnapshot(
                    scan_id=item.scan_id,
                    ip=item.ip,
                    # 其他字段使用模型默认值
                ))
            
            # 批量创建 IP 快照（忽略冲突）
            IPAddressSnapshot.objects.bulk_create(ip_snapshots, ignore_conflicts=True)
            logger.debug("IP地址快照保存成功 - 数量: %d", len(ip_snapshots))
            
        except Exception as e:
            logger.error(
                "保存IP地址快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
