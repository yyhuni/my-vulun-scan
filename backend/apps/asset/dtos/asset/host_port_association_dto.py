"""HostPortAssociation DTO"""

from dataclasses import dataclass


@dataclass
class HostPortAssociationDTO:
    """主机端口关联 DTO（资产表）"""
    target_id: int
    host: str
    ip: str
    port: int
