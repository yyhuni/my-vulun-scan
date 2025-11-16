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
    engine_config: Optional[str] = None
) -> Dict[str, Dict[str, Any]]:
    """
    解析 YAML 配置，获取启用的工具及其配置
    
    Args:
        scan_type: 扫描类型 (subdomain_discovery, port_scan, site_scan, directory_scan)
        engine_config: 引擎配置（YAML 字符串）
    
    Returns:
        启用的工具配置字典 {tool_name: tool_config}
        例如: {
            'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600},
            'amass_passive': {'enabled': True, 'timeout': 300}
        }
    
    Raises:
        ValueError: 配置格式错误或必需参数缺失/无效时抛出
        - 工具配置不是字典类型
        - enabled 字段类型不是 bool
        - enabled=true 但缺少 timeout 参数
        - timeout 参数类型不是 int
        - timeout 参数值 <= 0
    
    Example:
        >>> enabled_tools = parse_enabled_tools('subdomain_discovery', yaml_config)
        >>> for tool_name, tool_config in enabled_tools.items():
        ...     timeout = tool_config['timeout']  # 保证存在且有效
        ...     threads = tool_config.get('threads', 50)
    
    Note:
        - 返回的是工具配置字典，不是工具名列表
        - 采用严格验证模式：配置错误立即报错，不会跳过
        - 所有启用的工具保证包含有效的 timeout 参数
        - 命令构建逻辑在 command_helper 中实现
    """
    if not engine_config:
        # 没有配置 → 返回空字典，不执行任何工具
        logger.warning(f"没有引擎配置，{scan_type} 不会执行任何工具")
        return {}
    
    # 1. 解析引擎配置
    parsed_config = _parse_engine_config(engine_config)
    if scan_type not in parsed_config:
        logger.warning(f"引擎配置中未找到扫描类型: {scan_type}")
        return {}
    
    scan_config = parsed_config[scan_type]
    if 'tools' not in scan_config:
        logger.warning(f"扫描类型 {scan_type} 未配置任何工具")
        return {}
    
    tools = scan_config['tools']
    
    # 2. 过滤出启用的工具
    enabled_tools = {}
    for name, config in tools.items():
        if not isinstance(config, dict):
            raise ValueError(f"工具 {name} 配置格式错误：期望 dict，实际 {type(config).__name__}")
        
        # 检查是否启用（默认为 False）
        enabled_value = config.get('enabled', False)
        
        # 验证 enabled 字段类型（必需参数，类型错误直接报错）
        if not isinstance(enabled_value, bool):
            raise ValueError(
                f"工具 {name} 的 enabled 字段类型错误：期望 bool，实际 {type(enabled_value).__name__}"
            )
        
        if enabled_value:
            # 检查 timeout 必需参数
            if 'timeout' not in config:
                raise ValueError(
                    f"工具 {name} 缺少必需参数 'timeout'"
                )
            
            # 验证 timeout 值的有效性
            timeout_value = config['timeout']
            if not isinstance(timeout_value, int):
                raise ValueError(
                    f"工具 {name} 的 timeout 参数类型错误：期望 int，实际 {type(timeout_value).__name__}"
                )
            
            if timeout_value <= 0:
                raise ValueError(
                    f"工具 {name} 的 timeout 参数无效（{timeout_value}），必须大于0"
                )
            
            enabled_tools[name] = config
    
    logger.info(
        f"扫描类型: {scan_type}, "
        f"启用工具: {len(enabled_tools)}/{len(tools)}"
    )
    
    return enabled_tools
