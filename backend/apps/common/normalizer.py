def normalize_domain(domain: str) -> str:
    """
    规范化域名
    - 去除首尾空格
    - 转换为小写
    - 移除末尾的点
    
    Args:
        domain: 原始域名
        
    Returns:
        规范化后的域名
        
    Raises:
        ValueError: 域名为空或只包含空格
    """
    if not domain or not domain.strip():
        raise ValueError("域名不能为空")
    
    normalized = domain.strip().lower()
    
    # 移除末尾的点
    if normalized.endswith('.'):
        normalized = normalized.rstrip('.')
    
    return normalized
