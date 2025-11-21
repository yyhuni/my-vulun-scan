import logging
from typing import List

from apps.asset.models.scan_result_models import SubdomainScanResult
from apps.asset.dtos.subdomain_dto import SubdomainDTO

logger = logging.getLogger(__name__)


class DjangoScanResultRepository:
    """扫描结果Repository - 负责扫描结果表的数据访问"""

    def save_subdomain_scan_results(self, items: List[SubdomainDTO]) -> None:
        """
        保存子域名扫描结果
        
        Args:
            items: 子域名 DTO 列表
        
        Note:
            - 保存完整的扫描结果，不去重
            - 允许重复记录存在
        """
        try:
            logger.debug("准备保存子域名扫描结果 - 数量: %d", len(items))
            
            if not items:
                logger.debug("子域名扫描结果为空，跳过保存")
                return
                
            # 构建扫描结果对象
            scan_results = []
            for item in items:
                scan_results.append(SubdomainScanResult(
                    scan_id=item.scan_id,
                    name=item.name,
                    # 其他字段使用模型默认值
                ))
            
            # 批量创建（不使用 ignore_conflicts，保存所有记录）
            SubdomainScanResult.objects.bulk_create(scan_results)
            
            logger.debug("子域名扫描结果保存成功 - 数量: %d", len(scan_results))
            
        except Exception as e:
            logger.error(
                "保存子域名扫描结果失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
