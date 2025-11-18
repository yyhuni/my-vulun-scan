"""
Django ORM 实现的 Directory Repository
"""

import logging
from dataclasses import dataclass
from typing import List, Optional
from django.db import transaction, IntegrityError, OperationalError, DatabaseError

from apps.asset.models import Directory
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@dataclass
class DirectoryDTO:
    """目录数据传输对象"""
    website_id: int
    target_id: int
    scan_id: int
    url: str
    status: Optional[int] = None
    length: Optional[int] = None
    words: Optional[int] = None
    lines: Optional[int] = None
    content_type: str = ''
    duration: Optional[int] = None


@auto_ensure_db_connection
class DjangoDirectoryRepository:
    """Django ORM 实现的 Directory Repository"""

    def bulk_create_ignore_conflicts(self, items: List[DirectoryDTO]) -> int:
        """
        批量创建 Directory，忽略冲突
        
        Args:
            items: Directory DTO 列表
            
        Returns:
            int: 实际创建的记录数
            
        Raises:
            IntegrityError: 数据完整性错误
            OperationalError: 数据库操作错误
            DatabaseError: 数据库错误
        """
        if not items:
            return 0

        try:
            # 转换为 Django 模型对象
            directory_objects = [
                Directory(
                    website_id=item.website_id,
                    target_id=item.target_id,
                    scan_id=item.scan_id,
                    url=item.url,
                    status=item.status,
                    length=item.length,
                    words=item.words,
                    lines=item.lines,
                    content_type=item.content_type,
                    duration=item.duration
                )
                for item in items
            ]

            with transaction.atomic():
                # 批量插入或更新
                # 如果 website + url 已存在，则更新扫描字段，但不更新 scan_id（保留原始扫描任务关联）
                # 唯一约束：website + url（对应模型中的 unique_directory_url_website 约束）
                Directory.objects.bulk_create(
                    directory_objects,
                    update_conflicts=True,
                    unique_fields=['website', 'url'],  # 指定唯一字段，用于检测冲突
                    update_fields=[
                        'status', 'length', 'words', 'lines', 'content_type', 'duration'
                    ]
                )

            logger.debug(f"成功处理 {len(items)} 条 Directory 记录")
            return len(items)

        except IntegrityError as e:
            logger.error(
                f"批量插入 Directory 失败 - 数据完整性错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except OperationalError as e:
            logger.error(
                f"批量插入 Directory 失败 - 数据库操作错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except DatabaseError as e:
            logger.error(
                f"批量插入 Directory 失败 - 数据库错误: {e}, "
                f"记录数: {len(items)}"
            )
            raise

        except Exception as e:
            logger.error(
                f"批量插入 Directory 失败 - 未知错误: {e}, "
                f"记录数: {len(items)}, "
                f"错误类型: {type(e).__name__}",
                exc_info=True
            )
            raise

    def get_by_website(self, website_id: int) -> List[DirectoryDTO]:
        """
        获取指定站点的所有目录
        
        Args:
            website_id: 站点 ID
            
        Returns:
            List[DirectoryDTO]: 目录列表
        """
        try:
            directories = Directory.objects.filter(website_id=website_id)
            return [
                DirectoryDTO(
                    website_id=d.website_id,
                    target_id=d.target_id,
                    scan_id=d.scan_id,
                    url=d.url,
                    status=d.status,
                    length=d.length,
                    words=d.words,
                    lines=d.lines,
                    content_type=d.content_type,
                    duration=d.duration
                )
                for d in directories
            ]

        except Exception as e:
            logger.error(f"获取目录列表失败 - Website ID: {website_id}, 错误: {e}")
            raise

    def count_by_website(self, website_id: int) -> int:
        """
        统计指定站点的目录总数
        
        Args:
            website_id: 站点 ID
            
        Returns:
            int: 目录总数
        """
        try:
            count = Directory.objects.filter(website_id=website_id).count()
            logger.debug(f"Website {website_id} 的目录总数: {count}")
            return count

        except Exception as e:
            logger.error(f"统计目录数量失败 - Website ID: {website_id}, 错误: {e}")
            raise
    
    def get_all(self):
        """
        获取所有目录
        
        Returns:
            QuerySet: 目录查询集
        """
        return Directory.objects.all()
    
    def bulk_delete_by_ids(self, directory_ids: List[int]) -> tuple:
        """
        批量删除目录
        
        Args:
            directory_ids: 目录 ID 列表
            
        Returns:
            tuple: (删除数量, 级联删除的对象统计)
        """
        return Directory.objects.filter(id__in=directory_ids).delete()
