"""
目标导出服务

提供统一的目标提取和文件导出功能，支持：
- URL 导出（纯导出，不做隐式回退）
- 默认 URL 生成（独立方法）
- 带回退链的 URL 导出（用例层编排）
- 域名/IP 导出（用于端口扫描）
- 黑名单过滤集成
"""

import ipaddress
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable

from django.db.models import QuerySet

from apps.common.utils import BlacklistFilter

logger = logging.getLogger(__name__)


class DataSource:
    """数据源类型常量"""
    ENDPOINT = "endpoint"
    WEBSITE = "website"
    HOST_PORT = "host_port"
    DEFAULT = "default"


def create_export_service(target_id: int) -> 'TargetExportService':
    """
    工厂函数：创建带黑名单过滤的导出服务
    
    Args:
        target_id: 目标 ID，用于加载黑名单规则
        
    Returns:
        TargetExportService: 配置好黑名单过滤器的导出服务实例
    """
    from apps.common.services import BlacklistService
    
    rules = BlacklistService().get_rules(target_id)
    blacklist_filter = BlacklistFilter(rules)
    return TargetExportService(blacklist_filter=blacklist_filter)


def export_urls_with_fallback(
    target_id: int,
    output_file: str,
    sources: List[str],
    batch_size: int = 1000
) -> Dict[str, Any]:
    """
    带回退链的 URL 导出用例函数
    
    按 sources 顺序尝试每个数据源，直到有数据返回。
    
    回退逻辑：
    1. 遍历 sources 列表
    2. 对每个 source 构建 queryset 并调用 export_urls()
    3. 如果 total_count > 0，返回
    4. 如果 queryset_count > 0 但 total_count == 0（全被黑名单过滤），不回退
    5. 如果 source == "default"，调用 generate_default_urls()
    
    Args:
        target_id: 目标 ID
        output_file: 输出文件路径
        sources: 数据源优先级列表，如 ["endpoint", "website", "default"]
        batch_size: 批次大小
        
    Returns:
        dict: {
            'success': bool,
            'output_file': str,
            'total_count': int,
            'source': str,  # 实际使用的数据源
            'tried_sources': List[str],  # 尝试过的数据源
        }
    """
    from apps.asset.models import Endpoint, WebSite
    
    export_service = create_export_service(target_id)
    tried_sources = []
    
    for source in sources:
        tried_sources.append(source)
        
        if source == DataSource.DEFAULT:
            # 默认 URL 生成
            result = export_service.generate_default_urls(target_id, output_file)
            return {
                'success': result['success'],
                'output_file': result['output_file'],
                'total_count': result['total_count'],
                'source': DataSource.DEFAULT,
                'tried_sources': tried_sources,
            }
        
        # 构建对应数据源的 queryset
        if source == DataSource.ENDPOINT:
            queryset = Endpoint.objects.filter(target_id=target_id).values_list('url', flat=True)
        elif source == DataSource.WEBSITE:
            queryset = WebSite.objects.filter(target_id=target_id).values_list('url', flat=True)
        else:
            logger.warning("未知的数据源类型: %s，跳过", source)
            continue
        
        result = export_service.export_urls(
            target_id=target_id,
            output_path=output_file,
            queryset=queryset,
            batch_size=batch_size
        )
        
        # 有数据写入，返回
        if result['total_count'] > 0:
            logger.info("从 %s 导出 %d 条 URL", source, result['total_count'])
            return {
                'success': result['success'],
                'output_file': result['output_file'],
                'total_count': result['total_count'],
                'source': source,
                'tried_sources': tried_sources,
            }
        
        # 数据存在但全被黑名单过滤，不回退
        if result['queryset_count'] > 0:
            logger.info(
                "%s 有 %d 条数据，但全被黑名单过滤（filtered=%d），不回退",
                source, result['queryset_count'], result['filtered_count']
            )
            return {
                'success': result['success'],
                'output_file': result['output_file'],
                'total_count': 0,
                'source': source,
                'tried_sources': tried_sources,
            }
        
        # 数据源为空，继续尝试下一个
        logger.info("%s 为空，尝试下一个数据源", source)
    
    # 所有数据源都为空
    logger.warning("所有数据源都为空，无法导出 URL")
    return {
        'success': True,
        'output_file': output_file,
        'total_count': 0,
        'source': 'none',
        'tried_sources': tried_sources,
    }


class TargetExportService:
    """
    目标导出服务 - 提供统一的目标提取和文件导出功能
    
    使用方式：
        # 方式 1：使用用例函数（推荐）
        from apps.scan.services.target_export_service import export_urls_with_fallback, DataSource
        
        result = export_urls_with_fallback(
            target_id=1,
            output_file='/path/to/output.txt',
            sources=[DataSource.ENDPOINT, DataSource.WEBSITE, DataSource.DEFAULT]
        )
        
        # 方式 2：直接使用 Service（纯导出，不带回退）
        export_service = create_export_service(target_id)
        result = export_service.export_urls(target_id, output_path, queryset)
    """
    
    def __init__(self, blacklist_filter: Optional[BlacklistFilter] = None):
        """
        初始化导出服务
        
        Args:
            blacklist_filter: 黑名单过滤器，None 表示禁用过滤
        """
        self.blacklist_filter = blacklist_filter
    
    def export_urls(
        self,
        target_id: int,
        output_path: str,
        queryset: QuerySet,
        url_field: str = 'url',
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        纯 URL 导出函数 - 只负责将 queryset 数据写入文件
        
        不做任何隐式回退或默认 URL 生成。
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            queryset: 数据源 queryset（由调用方构建，应为 values_list flat=True）
            url_field: URL 字段名（用于黑名单过滤）
            batch_size: 批次大小
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int,        # 实际写入数量
                'queryset_count': int,     # 原始数据数量（迭代计数）
                'filtered_count': int,     # 被黑名单过滤的数量
            }
            
        Raises:
            IOError: 文件写入失败
        """
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        logger.info("开始导出 URL - target_id=%s, output=%s", target_id, output_path)
        
        total_count = 0
        filtered_count = 0
        queryset_count = 0
        
        try:
            with open(output_file, 'w', encoding='utf-8', buffering=8192) as f:
                for url in queryset.iterator(chunk_size=batch_size):
                    queryset_count += 1
                    if url:
                        # 黑名单过滤
                        if self.blacklist_filter and not self.blacklist_filter.is_allowed(url):
                            filtered_count += 1
                            continue
                        f.write(f"{url}\n")
                        total_count += 1
                        
                        if total_count % 10000 == 0:
                            logger.info("已导出 %d 个 URL...", total_count)
        except IOError as e:
            logger.error("文件写入失败: %s - %s", output_path, e)
            raise
        
        if filtered_count > 0:
            logger.info("黑名单过滤: 过滤 %d 个 URL", filtered_count)
        
        logger.info(
            "✓ URL 导出完成 - 写入: %d, 原始: %d, 过滤: %d, 文件: %s",
            total_count, queryset_count, filtered_count, output_path
        )
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_count,
            'queryset_count': queryset_count,
            'filtered_count': filtered_count,
        }

    def generate_default_urls(
        self,
        target_id: int,
        output_path: str
    ) -> Dict[str, Any]:
        """
        默认 URL 生成器
        
        根据 Target 类型生成默认 URL：
        - DOMAIN: http(s)://domain
        - IP: http(s)://ip
        - CIDR: 展开为所有 IP 的 http(s)://ip
        - URL: 直接使用目标 URL
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int,
            }
        """
        from apps.targets.services import TargetService
        from apps.targets.models import Target
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        target_service = TargetService()
        target = target_service.get_target(target_id)
        
        if not target:
            logger.warning("Target ID %d 不存在，无法生成默认 URL", target_id)
            return {
                'success': True,
                'output_file': str(output_file),
                'total_count': 0,
            }
        
        target_name = target.name
        target_type = target.type
        
        logger.info("生成默认 URL：Target 类型=%s, 名称=%s", target_type, target_name)
        
        total_urls = 0
        
        with open(output_file, 'w', encoding='utf-8', buffering=8192) as f:
            if target_type == Target.TargetType.DOMAIN:
                urls = [f"http://{target_name}", f"https://{target_name}"]
                for url in urls:
                    if self._should_write_url(url):
                        f.write(f"{url}\n")
                        total_urls += 1
                        
            elif target_type == Target.TargetType.IP:
                urls = [f"http://{target_name}", f"https://{target_name}"]
                for url in urls:
                    if self._should_write_url(url):
                        f.write(f"{url}\n")
                        total_urls += 1
                        
            elif target_type == Target.TargetType.CIDR:
                try:
                    network = ipaddress.ip_network(target_name, strict=False)
                    
                    for ip in network.hosts():
                        urls = [f"http://{ip}", f"https://{ip}"]
                        for url in urls:
                            if self._should_write_url(url):
                                f.write(f"{url}\n")
                                total_urls += 1
                        
                        if total_urls % 10000 == 0:
                            logger.info("已生成 %d 个 URL...", total_urls)
                    
                    # /32 或 /128 特殊处理
                    if total_urls == 0:
                        ip = str(network.network_address)
                        urls = [f"http://{ip}", f"https://{ip}"]
                        for url in urls:
                            if self._should_write_url(url):
                                f.write(f"{url}\n")
                                total_urls += 1
                                
                except ValueError as e:
                    logger.error("CIDR 解析失败: %s - %s", target_name, e)
                    raise ValueError(f"无效的 CIDR: {target_name}") from e
                    
            elif target_type == Target.TargetType.URL:
                if self._should_write_url(target_name):
                    f.write(f"{target_name}\n")
                    total_urls = 1
            else:
                logger.warning("不支持的 Target 类型: %s", target_type)
        
        logger.info("✓ 默认 URL 生成完成 - 数量: %d", total_urls)
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_urls,
        }
    
    def _should_write_url(self, url: str) -> bool:
        """检查 URL 是否应该写入（通过黑名单过滤）"""
        if self.blacklist_filter:
            return self.blacklist_filter.is_allowed(url)
        return True

    def export_hosts(
        self,
        target_id: int,
        output_path: str,
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """
        主机列表导出函数（用于端口扫描）
        
        根据 Target 类型选择导出逻辑：
        - DOMAIN: 从 Subdomain 表流式导出子域名
        - IP: 直接写入 IP 地址
        - CIDR: 展开为所有主机 IP
        
        Args:
            target_id: 目标 ID
            output_path: 输出文件路径
            batch_size: 批次大小
            
        Returns:
            dict: {
                'success': bool,
                'output_file': str,
                'total_count': int,
                'target_type': str
            }
        """
        from apps.targets.services import TargetService
        from apps.targets.models import Target
        from apps.asset.services.asset.subdomain_service import SubdomainService
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # 获取 Target 信息
        target_service = TargetService()
        target = target_service.get_target(target_id)
        
        if not target:
            raise ValueError(f"Target ID {target_id} 不存在")
        
        target_type = target.type
        target_name = target.name
        
        logger.info(
            "开始导出主机列表 - Target ID: %d, Name: %s, Type: %s, 输出文件: %s",
            target_id, target_name, target_type, output_path
        )
        
        total_count = 0
        
        if target_type == Target.TargetType.DOMAIN:
            total_count = self._export_domains(target_id, target_name, output_file, batch_size)
            type_desc = "域名"
            
        elif target_type == Target.TargetType.IP:
            total_count = self._export_ip(target_name, output_file)
            type_desc = "IP"
            
        elif target_type == Target.TargetType.CIDR:
            total_count = self._export_cidr(target_name, output_file)
            type_desc = "CIDR IP"
            
        else:
            raise ValueError(f"不支持的目标类型: {target_type}")
        
        logger.info(
            "✓ 主机列表导出完成 - 类型: %s, 总数: %d, 文件: %s",
            type_desc, total_count, output_path
        )
        
        return {
            'success': True,
            'output_file': str(output_file),
            'total_count': total_count,
            'target_type': target_type
        }
    
    def _export_domains(
        self,
        target_id: int,
        target_name: str,
        output_path: Path,
        batch_size: int
    ) -> int:
        """导出域名类型目标的根域名 + 子域名"""
        from apps.asset.services.asset.subdomain_service import SubdomainService
        
        subdomain_service = SubdomainService()
        domain_iterator = subdomain_service.iter_subdomain_names_by_target(
            target_id=target_id,
            chunk_size=batch_size
        )
        
        total_count = 0
        written_domains = set()  # 去重（子域名表可能已包含根域名）
        
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            # 1. 先写入根域名
            if self._should_write_target(target_name):
                f.write(f"{target_name}\n")
                written_domains.add(target_name)
                total_count += 1
            
            # 2. 再写入子域名（跳过已写入的根域名）
            for domain_name in domain_iterator:
                if domain_name in written_domains:
                    continue
                if self._should_write_target(domain_name):
                    f.write(f"{domain_name}\n")
                    written_domains.add(domain_name)
                    total_count += 1
                    
                    if total_count % 10000 == 0:
                        logger.info("已导出 %d 个域名...", total_count)
        
        return total_count
    
    def _export_ip(self, target_name: str, output_path: Path) -> int:
        """导出 IP 类型目标"""
        if self._should_write_target(target_name):
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"{target_name}\n")
            return 1
        return 0
    
    def _export_cidr(self, target_name: str, output_path: Path) -> int:
        """导出 CIDR 类型目标，展开为每个 IP"""
        network = ipaddress.ip_network(target_name, strict=False)
        total_count = 0
        
        with open(output_path, 'w', encoding='utf-8', buffering=8192) as f:
            for ip in network.hosts():
                ip_str = str(ip)
                if self._should_write_target(ip_str):
                    f.write(f"{ip_str}\n")
                    total_count += 1
                    
                    if total_count % 10000 == 0:
                        logger.info("已导出 %d 个 IP...", total_count)
        
        # /32 或 /128 特殊处理
        if total_count == 0:
            ip_str = str(network.network_address)
            if self._should_write_target(ip_str):
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(f"{ip_str}\n")
                total_count = 1
        
        return total_count
    
    def _should_write_target(self, target: str) -> bool:
        """检查目标是否应该写入（通过黑名单过滤）"""
        if self.blacklist_filter:
            return self.blacklist_filter.is_allowed(target)
        return True
