"""HostPortAssociationSnapshot DTO"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class HostPortAssociationSnapshotDTO:
    """主机端口关联快照 DTO"""
    scan_id: int
    host: str
    ip: str
    port: int
    target_id: Optional[int] = None  # 冗余字段，用于同步到资产表
    
    def to_asset_dto(self):
        """
        转换为资产 DTO（用于同步到资产表）
        
        Returns:
            HostPortAssociationDTO: 资产表 DTO（移除 scan_id）
        """
        from apps.asset.dtos.asset import HostPortAssociationDTO
        
        if self.target_id is None:
            raise ValueError("target_id 不能为 None，无法同步到资产表")
        
        return HostPortAssociationDTO(
            target_id=self.target_id,
            host=self.host,
            ip=self.ip,
            port=self.port
        )
