"""
SystemConfig 数据访问层 Django ORM 实现

基于 Django ORM 的 SystemConfig Repository 实现类
"""

import logging

from apps.engine.models import SystemConfig
from apps.common.decorators import auto_ensure_db_connection

logger = logging.getLogger(__name__)


@auto_ensure_db_connection
class DjangoSystemConfigRepository:
    """基于 Django ORM 的 SystemConfig 数据访问层实现"""

    def get_public_ip(self) -> str:
        """获取公网 IP 配置"""
        return SystemConfig.get_value('public_ip', '')

    def set_public_ip(self, public_ip: str) -> None:
        """设置公网 IP 配置"""
        SystemConfig.set_value(
            'public_ip',
            public_ip,
            '服务器公网 IP 地址，用于远程 Worker 回调',
        )


__all__ = ['DjangoSystemConfigRepository']
