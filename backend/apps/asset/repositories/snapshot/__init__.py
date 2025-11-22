"""Snapshot Repositories - 快照模块的数据访问层"""

from .subdomain_snapshot_repository import DjangoSubdomainSnapshotRepository
from .host_port_mapping_snapshot_repository import DjangoHostPortMappingSnapshotRepository

__all__ = [
    'DjangoSubdomainSnapshotRepository',
    'DjangoHostPortMappingSnapshotRepository',
]
