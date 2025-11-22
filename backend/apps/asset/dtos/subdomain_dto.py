"""Subdomain DTO"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class SubdomainDTO:
    """
    子域名 DTO
    
    用于传递子域名数据，在不同层之间进行数据交换
    """
    name: str
    target_id: int  # 必填：子域名必须属于某个目标
    scan_id: Optional[int] = None  # 可选：扫描任务ID
