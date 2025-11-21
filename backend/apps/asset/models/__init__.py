# 导入所有模型，确保Django能发现它们

# 业务模型
from .asset_models import (
    Subdomain,
    WebSite,
    IPAddress,
    Port,
    Endpoint,
    Directory,
)

# 扫描结果模型
from .scan_result_models import (
    SubdomainScanResult,
    WebsiteScanResult,
    PortScanResult,
    DirectoryScanResult,
)

# 导出所有模型供外部导入
__all__ = [
    # 业务模型
    'Subdomain',
    'WebSite', 
    'IPAddress',
    'Port',
    'Endpoint',
    'Directory',
    # 扫描结果模型
    'SubdomainScanResult',
    'WebsiteScanResult', 
    'PortScanResult',
    'DirectoryScanResult',
]
