"""HostPortMappingSnapshot Repository - Django ORM 实现"""

import logging
from typing import List, Iterator

from apps.asset.models.snapshot_models import HostPortMappingSnapshot
from apps.asset.dtos.snapshot import HostPortMappingSnapshotDTO
from apps.common.decorators import auto_ensure_db_connection
from apps.common.utils import deduplicate_for_bulk

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoHostPortMappingSnapshotRepository:
    """HostPortMappingSnapshot Repository - Django ORM 实现，负责主机端口映射快照表的数据访问"""

    def save_snapshots(self, items: List[HostPortMappingSnapshotDTO]) -> None:
        """
        保存主机端口关联快照
        
        注意：会自动按 (scan_id, host, ip, port) 去重，保留最后一条记录。
        
        Args:
            items: 主机端口关联快照 DTO 列表
        
        Note:
            - 保存完整的快照数据
            - 基于唯一约束 (scan + host + ip + port) 自动去重
        """
        try:
            logger.debug("准备保存主机端口关联快照 - 数量: %d", len(items))
            
            if not items:
                logger.debug("主机端口关联快照为空，跳过保存")
                return
            
            # 根据模型唯一约束自动去重
            unique_items = deduplicate_for_bulk(items, HostPortMappingSnapshot)
                
            # 构建快照对象
            snapshots = []
            for item in unique_items:
                snapshots.append(HostPortMappingSnapshot(
                    scan_id=item.scan_id,
                    host=item.host,
                    ip=item.ip,
                    port=item.port
                ))
            
            # 批量创建（忽略冲突，基于唯一约束去重）
            HostPortMappingSnapshot.objects.bulk_create(
                snapshots, 
                ignore_conflicts=True
            )
            
            logger.debug("主机端口关联快照保存成功 - 数量: %d", len(snapshots))
            
        except Exception as e:
            logger.error(
                "保存主机端口关联快照失败 - 数量: %d, 错误: %s",
                len(items),
                str(e),
                exc_info=True
            )
            raise
    
    def get_ip_aggregation_by_scan(self, scan_id: int, filter_query: str = None):
        from django.db.models import Min
        from apps.common.utils.filter_utils import apply_filters

        qs = HostPortMappingSnapshot.objects.filter(scan_id=scan_id)
        
        # 应用智能过滤
        if filter_query:
            field_mapping = {
                'ip': 'ip',
                'port': 'port',
                'host': 'host',
            }
            qs = apply_filters(qs, filter_query, field_mapping)

        ip_aggregated = (
            qs
            .values('ip')
            .annotate(
                created_at=Min('created_at')
            )
            .order_by('-created_at')
        )

        results = []
        for item in ip_aggregated:
            ip = item['ip']
            mappings = (
                HostPortMappingSnapshot.objects
                .filter(scan_id=scan_id, ip=ip)
                .values('host', 'port')
                .distinct()
            )

            hosts = sorted({m['host'] for m in mappings})
            ports = sorted({m['port'] for m in mappings})

            results.append({
                'ip': ip,
                'hosts': hosts,
                'ports': ports,
                'created_at': item['created_at'],
            })

        return results

    def get_all_ip_aggregation(self, filter_query: str = None):
        """获取所有 IP 聚合数据"""
        from django.db.models import Min
        from apps.common.utils.filter_utils import apply_filters

        qs = HostPortMappingSnapshot.objects.all()
        
        # 应用智能过滤
        if filter_query:
            field_mapping = {
                'ip': 'ip',
                'port': 'port',
                'host': 'host',
            }
            qs = apply_filters(qs, filter_query, field_mapping)

        ip_aggregated = (
            qs
            .values('ip')
            .annotate(created_at=Min('created_at'))
            .order_by('-created_at')
        )

        results = []
        for item in ip_aggregated:
            ip = item['ip']
            mappings = (
                HostPortMappingSnapshot.objects
                .filter(ip=ip)
                .values('host', 'port')
                .distinct()
            )
            hosts = sorted({m['host'] for m in mappings})
            ports = sorted({m['port'] for m in mappings})
            results.append({
                'ip': ip,
                'hosts': hosts,
                'ports': ports,
                'created_at': item['created_at'],
            })
        return results

    def get_ips_for_export(self, scan_id: int, batch_size: int = 1000) -> Iterator[str]:
        """流式导出扫描下的所有唯一 IP 地址。"""
        queryset = (
            HostPortMappingSnapshot.objects
            .filter(scan_id=scan_id)
            .values_list("ip", flat=True)
            .distinct()
            .order_by("ip")
            .iterator(chunk_size=batch_size)
        )
        for ip in queryset:
            yield ip

    def iter_raw_data_for_export(
        self, 
        scan_id: int,
        batch_size: int = 1000
    ) -> Iterator[dict]:
        """
        流式获取原始数据用于 CSV 导出
        
        Args:
            scan_id: 扫描 ID
            batch_size: 每批数据量
        
        Yields:
            {
                'ip': '192.168.1.1',
                'host': 'example.com',
                'port': 80,
                'created_at': datetime
            }
        """
        qs = (
            HostPortMappingSnapshot.objects
            .filter(scan_id=scan_id)
            .values('ip', 'host', 'port', 'created_at')
            .order_by('ip', 'host', 'port')
        )
        
        for row in qs.iterator(chunk_size=batch_size):
            yield row

    def iter_unique_host_ports_by_scan(
        self,
        scan_id: int,
        batch_size: int = 1000
    ) -> Iterator[dict]:
        """
        流式获取扫描下的唯一 host:port 组合（去重）
        
        用于生成 URL 时避免重复，同一个 host:port 可能对应多个 IP，
        但生成 URL 时只需要一个。
        
        Args:
            scan_id: 扫描 ID
            batch_size: 每批数据量
        
        Yields:
            {'host': 'example.com', 'port': 80}
        """
        qs = (
            HostPortMappingSnapshot.objects
            .filter(scan_id=scan_id)
            .values('host', 'port')
            .distinct()
            .order_by('host', 'port')
        )
        
        for row in qs.iterator(chunk_size=batch_size):
            yield row
