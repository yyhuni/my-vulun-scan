"""域名工具函数"""
import validators




def validate_domain(domain: str) -> None:
    """
    验证域名格式（使用 validators 库）
    
    Args:
        domain: 域名字符串
        
    Raises:
        ValueError: 域名格式无效
    """
    if not domain:
        raise ValueError("域名不能为空")
    
    # 使用 validators 库验证域名格式
    # 支持国际化域名（IDN）和各种边界情况
    if not validators.domain(domain):
        raise ValueError(f"域名格式无效: {domain}")
