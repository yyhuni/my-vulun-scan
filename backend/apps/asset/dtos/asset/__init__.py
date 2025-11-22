"""Asset DTOs - 资产模块的数据传输对象"""

from .subdomain_dto import SubdomainDTO
from .subdomain_ip_association_dto import SubdomainIPAssociationDTO

__all__ = [
    'SubdomainDTO',
    'SubdomainIPAssociationDTO',
]
