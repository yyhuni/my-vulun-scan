"""
扫描状态管理服务

职责：
- 更新扫描状态
- 条件状态更新（乐观锁）
- 更新缓存统计数据
"""

import logging
from datetime import datetime
from django.db.utils import DatabaseError, OperationalError
from django.core.exceptions import ObjectDoesNotExist

from apps.common.definitions import ScanStatus
from apps.scan.repositories import DjangoScanRepository

logger = logging.getLogger(__name__)


class ScanStateService:
    """
    扫描状态管理服务
    
    职责：
    - 更新扫描状态
    - 条件状态更新（乐观锁）
    - 更新缓存统计数据
    - 状态验证
    """
    
    def __init__(self):
        """
        初始化服务
        """
        self.scan_repo = DjangoScanRepository()
    
    def update_status(
        self, 
        scan_id: int, 
        status: ScanStatus, 
        error_message: str | None = None,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        更新 Scan 状态
        
        Args:
            scan_id: 扫描任务 ID
            status: 新状态
            error_message: 错误消息（可选）
            stopped_at: 结束时间（可选）
        
        Returns:
            是否更新成功
        
        Note:
            created_at 是自动设置的，不需要手动传递
        """
        try:
            result = self.scan_repo.update_status(
                scan_id, 
                status, 
                error_message,
                stopped_at=stopped_at
            )
            if result:
                logger.debug(
                    "更新 Scan 状态成功 - Scan ID: %s, 状态: %s", 
                    scan_id, 
                    ScanStatus(status).label
                )
            return result
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：更新 Scan 状态失败 - Scan ID: %s", scan_id)
            raise  # 数据库错误应该向上传播
        except ObjectDoesNotExist:
            logger.error("Scan 不存在 - Scan ID: %s", scan_id)
            return False
    
    def update_status_if_match(
        self,
        scan_id: int,
        current_status: ScanStatus,
        new_status: ScanStatus,
        stopped_at: datetime | None = None
    ) -> bool:
        """
        条件更新 Scan 状态（原子操作）
        
        仅当扫描状态匹配 current_status 时才更新为 new_status。
        这是一个原子操作，用于处理并发场景下的状态更新。
        
        Args:
            scan_id: 扫描任务 ID
            current_status: 当前期望的状态
            new_status: 要更新到的新状态
            stopped_at: 结束时间（可选）
        
        Returns:
            是否更新成功（True=更新了记录，False=未更新或状态不匹配）
        
        Note:
            此方法通过 Repository 层执行原子操作，适用于需要条件更新的场景
        """
        try:
            result = self.scan_repo.update_status_if_match(
                scan_id=scan_id,
                current_status=current_status,
                new_status=new_status,
                stopped_at=stopped_at
            )
            if result:
                logger.debug(
                    "条件更新 Scan 状态成功 - Scan ID: %s, %s → %s",
                    scan_id,
                    current_status.value,
                    new_status.value
                )
            return result
        except (DatabaseError, OperationalError) as e:
            logger.exception(
                "数据库错误：条件更新 Scan 状态失败 - Scan ID: %s",
                scan_id
            )
            raise
        except Exception as e:
            logger.error(
                "条件更新 Scan 状态失败 - Scan ID: %s, 错误: %s",
                scan_id,
                e
            )
            return False
    
    def update_cached_stats(self, scan_id: int) -> bool:
        """
        更新扫描任务的缓存统计数据
        
        使用 Repository 层进行数据访问，符合分层架构规范
        
        Args:
            scan_id: 扫描任务 ID
        
        Returns:
            是否更新成功
        
        Note:
            应该在扫描进入终态时调用，更新缓存的统计字段以提升查询性能
        """
        try:
            # 通过 Repository 层更新统计数据
            result = self.scan_repo.update_cached_stats(scan_id)
            if result:
                logger.debug("更新缓存统计数据成功 - Scan ID: %s", scan_id)
            return result
        except (DatabaseError, OperationalError) as e:
            logger.exception("数据库错误：更新缓存统计数据失败 - Scan ID: %s", scan_id)
            return False
        except Exception as e:
            logger.error("更新缓存统计数据失败 - Scan ID: %s, 错误: %s", scan_id, e)
            return False


# 导出接口
__all__ = ['ScanStateService']
