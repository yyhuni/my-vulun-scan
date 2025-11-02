"""域名和目标验证工具函数"""
import ipaddress
import validators


def validate_domain(domain: str) -> None:
    """
    验证域名格式（使用 validators 库）
    
    Args:
        domain: 域名字符串（应该已经规范化）
        
    Raises:
        ValueError: 域名格式无效
    """
    if not domain:
        raise ValueError("域名不能为空")
    
    # 使用 validators 库验证域名格式
    # 支持国际化域名（IDN）和各种边界情况
    if not validators.domain(domain):
        raise ValueError(f"域名格式无效: {domain}")


def validate_ip(ip: str) -> None:
    """
    验证 IP 地址格式（支持 IPv4 和 IPv6）
    
    Args:
        ip: IP 地址字符串（应该已经规范化）
        
    Raises:
        ValueError: IP 地址格式无效
    """
    if not ip:
        raise ValueError("IP 地址不能为空")
    
    try:
        ipaddress.ip_address(ip)
    except ValueError:
        raise ValueError(f"IP 地址格式无效: {ip}")


def validate_cidr(cidr: str) -> None:
    """
    验证 CIDR 格式（支持 IPv4 和 IPv6）
    
    Args:
        cidr: CIDR 字符串（应该已经规范化）
        
    Raises:
        ValueError: CIDR 格式无效
    """
    if not cidr:
        raise ValueError("CIDR 不能为空")
    
    try:
        ipaddress.ip_network(cidr, strict=False)
    except ValueError:
        raise ValueError(f"CIDR 格式无效: {cidr}")


def detect_target_type(name: str) -> str:
    """
    检测目标类型（不做规范化，只验证）
    
    Args:
        name: 目标名称（应该已经规范化）
        
    Returns:
        str: 目标类型 ('domain', 'ip', 'cidr')
        
    Raises:
        ValueError: 如果无法识别目标类型
    """
    if not name:
        raise ValueError("目标名称不能为空")
    
    # 检查是否是 CIDR 格式（包含 /）
    if '/' in name:
        validate_cidr(name)
        return 'cidr'
    
    # 检查是否是 IP 地址
    try:
        validate_ip(name)
        return 'ip'
    except ValueError:
        pass
    
    # 检查是否是合法域名
    try:
        validate_domain(name)
        return 'domain'
    except ValueError:
        pass
    
    # 无法识别的格式
    raise ValueError(f"无法识别的目标格式: {name}，必须是域名、IP地址或CIDR范围")
