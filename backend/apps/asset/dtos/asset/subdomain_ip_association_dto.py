"""SubdomainIPAssociation DTO"""

from dataclasses import dataclass


@dataclass
class SubdomainIPAssociationDTO:
    """
    子域名-IP关联 DTO（纯资产）
    
    只包含关联关系，不包含扫描上下文信息。
    扫描上下文存储在快照表中。
    """
    subdomain_id: int
    ip_address_id: int
