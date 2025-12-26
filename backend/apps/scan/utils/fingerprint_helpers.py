"""指纹文件本地缓存工具

提供 Worker 侧的指纹文件缓存和版本校验功能，用于：
- 指纹识别扫描 (fingerprint_scan_flow)
"""

import logging
import os

from django.conf import settings

logger = logging.getLogger(__name__)


def ensure_ehole_fingerprint_local() -> str:
    """
    确保本地存在最新的 EHole 指纹文件（带缓存）
    
    流程：
    1. 获取当前指纹库版本
    2. 检查缓存文件是否存在且版本匹配
    3. 版本不匹配则重新导出
    
    Returns:
        str: 本地指纹文件路径
    
    使用场景：
        Worker 执行扫描任务前调用，获取最新指纹文件路径
    """
    from apps.engine.services.fingerprints import EholeFingerprintService
    
    service = EholeFingerprintService()
    current_version = service.get_fingerprint_version()
    
    # 缓存目录和文件
    base_dir = getattr(settings, 'FINGERPRINTS_BASE_PATH', '/opt/xingrin/fingerprints')
    os.makedirs(base_dir, exist_ok=True)
    cache_file = os.path.join(base_dir, 'ehole.json')
    version_file = os.path.join(base_dir, 'ehole.version')
    
    # 检查缓存版本
    cached_version = None
    if os.path.exists(version_file):
        try:
            with open(version_file, 'r') as f:
                cached_version = f.read().strip()
        except OSError as e:
            logger.warning("读取版本文件失败: %s", e)
    
    # 版本匹配，直接返回缓存
    if cached_version == current_version and os.path.exists(cache_file):
        logger.info("EHole 指纹文件缓存有效（版本匹配）: %s", cache_file)
        return cache_file
    
    # 版本不匹配，重新导出
    logger.info(
        "EHole 指纹文件需要更新: cached=%s, current=%s",
        cached_version, current_version
    )
    service.export_to_file(cache_file)
    
    # 写入版本文件
    try:
        with open(version_file, 'w') as f:
            f.write(current_version)
    except OSError as e:
        logger.warning("写入版本文件失败: %s", e)
    
    logger.info("EHole 指纹文件已更新: %s", cache_file)
    return cache_file


__all__ = ["ensure_ehole_fingerprint_local"]
