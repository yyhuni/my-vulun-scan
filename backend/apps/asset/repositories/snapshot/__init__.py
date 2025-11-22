"""Snapshot Repositories - 快照模块的数据访问层"""

from .subdomain_snapshot_repository import DjangoSubdomainSnapshotRepository
from .host_port_association_snapshot_repository import DjangoHostPortAssociationSnapshotRepository

__all__ = [
    'DjangoSubdomainSnapshotRepository',
    'DjangoHostPortAssociationSnapshotRepository',
]
