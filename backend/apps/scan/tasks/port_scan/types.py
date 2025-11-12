"""
端口扫描相关类型定义
"""

from typing import TypedDict


class PortScanRecord(TypedDict):
    """端口扫描记录类型定义"""
    host: str   # 域名
    ip: str     # IP 地址
    port: int   # 端口号
