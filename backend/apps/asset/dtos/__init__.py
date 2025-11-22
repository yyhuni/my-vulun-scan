"""Asset DTOs - 数据传输对象"""

# 资产模块 DTOs
from .asset import (
    SubdomainDTO,
    SubdomainIPAssociationDTO,
)

# 快照 DTO（独立）
from .subdomain_snapshot_dto import SubdomainSnapshotDTO

__all__ = [
    # 资产模块
    'SubdomainDTO',
    'SubdomainIPAssociationDTO',
    # 快照
    'SubdomainSnapshotDTO',
]
