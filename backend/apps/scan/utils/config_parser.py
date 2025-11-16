"""
配置解析器

负责解析引擎配置（YAML）并提取启用的工具及其配置。

架构说明：
- 命令模板：在 command_templates.py 中定义（基础命令 + 可选参数映射）
- 工具配置：从引擎配置（engine_config YAML 字符串）读取
- 无默认配置文件：所有配置必须在引擎配置中提供

核心函数：
- parse_enabled_tools(): 解析并过滤启用的工具，返回工具配置字典

返回格式：
- {'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600}}
- timeout 是必需参数，不提供会报错
"""

import yaml
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def _parse_engine_config(engine_config_str: Optional[str]) -> Dict[str, Any]:
    """
    解析引擎配置（YAML 字符串）
    
    Args:
        engine_config_str: YAML 格式的引擎配置字符串
    
    Returns:
        引擎配置字典
    """
    if not engine_config_str or not engine_config_str.strip():
        return {}
    
    try:
        config = yaml.safe_load(engine_config_str) or {}
        logger.debug(f"解析引擎配置成功: {len(config)} 个配置项")
        return config
    except yaml.YAMLError as e:
        logger.error(f"解析引擎配置失败: {e}")
        return {}


def parse_enabled_tools(
    scan_type: str,
    engine_config_str: Optional[str] = None
) -> Dict[str, Dict[str, Any]]:
    """
    解析 YAML 配置，获取启用的工具及其配置
    
    Args:
        scan_type: 扫描类型 (subdomain_discovery, port_scan, site_scan, directory_scan)
        engine_config_str: 引擎配置（YAML 字符串）
    
    Returns:
        启用的工具配置字典 {tool_name: tool_config}
        例如: {
            'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600},
            'amass_passive': {'enabled': True, 'timeout': 300}
        }
    
    Example:
        >>> enabled_tools = parse_enabled_tools('subdomain_discovery', yaml_config)
        >>> for tool_name, tool_config in enabled_tools.items():
        ...     timeout = tool_config['timeout']
        ...     threads = tool_config.get('threads', 50)
    
    Note:
        返回的是工具配置字典，不是工具名列表。
        命令构建逻辑在 command_helper 中实现。
    """
    if not engine_config_str:
        # 没有配置 → 返回空字典，不执行任何工具
        logger.warning(f"没有引擎配置，{scan_type} 不会执行任何工具")
        return {}
    
    # 1. 解析引擎配置
    engine_config = _parse_engine_config(engine_config_str)
    if scan_type not in engine_config:
        logger.warning(f"引擎配置中未找到扫描类型: {scan_type}")
        return {}
    
    scan_config = engine_config[scan_type]
    if 'tools' not in scan_config:
        logger.warning(f"扫描类型 {scan_type} 未配置任何工具")
        return {}
    
    tools = scan_config['tools']
    
    # 2. 过滤出启用的工具
    enabled_tools = {}
    for name, config in tools.items():
        if not isinstance(config, dict):
            logger.warning(f"工具 {name} 配置格式错误，跳过")
            continue
        
        # 检查是否启用（默认为 False）
        if config.get('enabled', False):
            # 检查必需参数
            if 'timeout' not in config:
                logger.warning(
                    f"工具 {name} 缺少必需参数 'timeout'，跳过"
                )
                continue
            
            enabled_tools[name] = config
    
    logger.info(
        f"扫描类型: {scan_type}, "
        f"启用工具: {len(enabled_tools)}/{len(tools)}"
    )
    
    return enabled_tools
