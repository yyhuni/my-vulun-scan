import logging
from typing import List

from apps.asset.dtos.subdomain_dto import SubdomainDTO
from apps.asset.repositories.django_scan_result_repository import DjangoScanResultRepository

logger = logging.getLogger(__name__)


class ScanResultService:
    """扫描结果服务 - 负责扫描结果的业务逻辑"""
    
    def __init__(self):
        self.repo = DjangoScanResultRepository()
    
    def save_subdomain_scan_results(self, items: List[SubdomainDTO]) -> None:
        """
        保存子域名扫描结果（统一入口）
        
        流程：
        1. 保存到扫描结果表（完整记录）
        2. 保存到业务表（去重）
        
        Args:
            items: 子域名 DTO 列表
        """
        logger.debug("保存子域名扫描结果 - 数量: %d", len(items))
        
        if not items:
            logger.debug("扫描结果为空，跳过保存")
            return
        
        try:
            # 1. 保存扫描结果表（完整记录）
            self.repo.save_subdomain_scan_results(items)
            
            # 2. 保存业务表（去重）
            from apps.asset.services.subdomain_service import SubdomainService
            subdomain_service = SubdomainService()
            subdomain_service.bulk_create_ignore_conflicts(items)
            
            logger.info("子域名扫描结果和业务数据保存成功 - 数量: %d", len(items))
            
        except Exception as e:
            logger.error(
                "保存子域名扫描结果失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
    
    # 未来扩展：其他扫描结果保存方法
    # def save_website_scan_results(self, items: List[WebsiteDTO]) -> None:
    # def save_port_scan_results(self, items: List[PortDTO]) -> None:
