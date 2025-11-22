"""SubdomainSnapshot DTO"""

from dataclasses import dataclass


@dataclass
class SubdomainSnapshotDTO:
    """
    子域名快照 DTO
    
    用于传递快照数据，包含扫描上下文信息。
    快照表记录每次扫描的历史数据。
    """
    name: str
    scan_id: int  # 必填：快照必须关联扫描任务
