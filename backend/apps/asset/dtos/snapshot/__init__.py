"""Snapshot DTOs - 快照模块的数据传输对象"""

from .subdomain_snapshot_dto import SubdomainSnapshotDTO
from .host_port_association_snapshot_dto import HostPortAssociationSnapshotDTO

__all__ = [
    'SubdomainSnapshotDTO',
    'HostPortAssociationSnapshotDTO',
]
