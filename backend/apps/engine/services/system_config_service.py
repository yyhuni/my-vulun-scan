"""
SystemConfig 业务逻辑服务层（Service）

负责系统配置相关的业务逻辑处理
"""

import logging

from apps.engine.repositories import DjangoSystemConfigRepository
from apps.common.validators import validate_ip

logger = logging.getLogger(__name__)


class SystemConfigService:
    """SystemConfig 业务逻辑服务"""

    def __init__(self) -> None:
        """初始化服务，注入 Repository 依赖"""
        self.repo = DjangoSystemConfigRepository()

    # ==================== 公网 IP 配置 ====================

    def get_public_ip(self) -> str:
        """获取公网 IP 配置"""
        return self.repo.get_public_ip()

    def set_public_ip(self, public_ip: str) -> str:
        """更新公网 IP 配置

        如果传入为空字符串，则不更新，直接返回当前配置。
        """
        if not public_ip:
            return self.repo.get_public_ip()

        # 校验 IPv4/IPv6 格式
        validate_ip(public_ip)

        self.repo.set_public_ip(public_ip)
        return public_ip


__all__ = ['SystemConfigService']
