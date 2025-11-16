import logging
from typing import List, Iterator

from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import Subdomain
from .subdomain_repository import SubdomainRepository, SubdomainDTO
from .db_connection_decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoSubdomainRepository(SubdomainRepository):
    """基于 Django ORM 的子域名仓储实现。"""

    def bulk_create_ignore_conflicts(self, items: List[SubdomainDTO]) -> None:
        """
        批量创建子域名，忽略冲突
        
        Args:
            items: 子域名 DTO 列表
            
        Raises:
            IntegrityError: 数据完整性错误（如唯一约束冲突）
            OperationalError: 数据库操作错误（如连接失败）
            DatabaseError: 其他数据库错误
        """
        if not items:
            return

        try:
            subdomain_objects = [
                Subdomain(
                    name=item.name,
                    scan_id=item.scan_id,
                    target_id=item.target_id,
                    cname=[],  # 显式设置为空列表，避免 ArrayField 类型不匹配
                    is_cdn=False,  # 设置默认值
                    cdn_name='',  # 设置默认值
                )
                for item in items
            ]

            with transaction.atomic():
                # 使用 ignore_conflicts 策略：
                # - 新子域名：INSERT 完整记录
                # - 已存在子域名：忽略（不更新，因为没有探测字段数据）
                # 注意：ignore_conflicts 无法返回实际创建的数量
                Subdomain.objects.bulk_create(  # type: ignore[attr-defined]
                    subdomain_objects,
                    ignore_conflicts=True,  # 忽略重复记录
                )

            logger.debug(f"成功处理 {len(items)} 条子域名记录")

        except IntegrityError as e:
            logger.error(
                f"批量插入子域名失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}, "
                f"示例域名: {items[0].name if items else 'N/A'}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入子域名失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入子域名失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入子域名失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise
    
    def get_domains_for_export(self, target_id: int, batch_size: int = 1000) -> Iterator[str]:
        """
        流式导出域名（用于生成扫描工具输入文件）
        
        使用 iterator() 进行流式查询，避免一次性加载所有数据到内存
        
        Args:
            target_id: 目标 ID
            batch_size: 每次从数据库读取的行数
            
        Yields:
            str: 域名
        """
        queryset = Subdomain.objects.filter(
            target_id=target_id
        ).only('name').iterator(chunk_size=batch_size)
        
        for subdomain in queryset:
            yield subdomain.name
    
    def count_by_target(self, target_id: int) -> int:
        """
        统计目标下的域名数量
        
        Args:
            target_id: 目标 ID
            
        Returns:
            int: 域名数量
        """
        return Subdomain.objects.filter(target_id=target_id).count()
    
    def get_by_names_and_target_id(self, names: set, target_id: int) -> dict:
        """
        根据域名列表和目标ID批量查询 Subdomain
        
        Args:
            names: 域名集合
            target_id: 目标 ID
            
        Returns:
            dict: {domain_name: Subdomain对象}
        """
        subdomains = Subdomain.objects.filter(
            name__in=names,
            target_id=target_id
        ).only('id', 'name')
        
        return {sd.name: sd for sd in subdomains}


