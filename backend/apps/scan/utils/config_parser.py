"""
配置解析器

负责解析引擎配置（YAML）并提取启用的工具及其配置。

架构说明：
- 命令模板：在 command_templates.py 中定义（基础命令 + 可选参数映射）
- 工具配置：从引擎配置（engine_config YAML 字符串）读取
- 无默认配置文件：所有配置必须在引擎配置中提供

核心函数：
- parse_enabled_tools_from_dict(): 解析并过滤启用的工具，返回工具配置字典

返回格式：
- {'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600}}
- timeout 是必需参数，支持整数或 'auto'（由具体 Flow 处理）
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def parse_enabled_tools_from_dict(
    scan_type: str,
    parsed_config: Dict[str, Any]
) -> Dict[str, Dict[str, Any]]:
    """
    从解析后的配置字典中获取启用的工具及其配置
    
    Args:
        scan_type: 扫描类型 (subdomain_discovery, port_scan, site_scan, directory_scan)
        parsed_config: 已解析的配置字典
    
    Returns:
        启用的工具配置字典 {tool_name: tool_config}
    
    Raises:
        ValueError: 配置格式错误或必需参数缺失/无效时抛出
    """
    if not parsed_config:
        logger.warning(f"配置字典为空 - scan_type: {scan_type}")
        return {}
    
    if scan_type not in parsed_config:
        logger.warning(f"配置中未找到扫描类型: {scan_type}")
        return {}
    
    scan_config = parsed_config[scan_type]
    if 'tools' not in scan_config:
        logger.warning(f"扫描类型 {scan_type} 未配置任何工具")
        return {}
    
    tools = scan_config['tools']
    
    # 过滤出启用的工具
    enabled_tools = {}
    for name, config in tools.items():
        if not isinstance(config, dict):
            raise ValueError(f"工具 {name} 配置格式错误：期望 dict，实际 {type(config).__name__}")
        
        # 检查是否启用（默认为 False）
        enabled_value = config.get('enabled', False)
        
        # 验证 enabled 字段类型
        if not isinstance(enabled_value, bool):
            raise ValueError(
                f"工具 {name} 的 enabled 字段类型错误：期望 bool，实际 {type(enabled_value).__name__}"
            )
        
        if enabled_value:
            # 检查 timeout 必需参数
            if 'timeout' not in config:
                raise ValueError(f"工具 {name} 缺少必需参数 'timeout'")
            
            # 验证 timeout 值的有效性
            timeout_value = config['timeout']
            
            if timeout_value == 'auto':
                # 允许 'auto'，由具体 Flow 处理
                pass
            elif isinstance(timeout_value, int):
                if timeout_value <= 0:
                    raise ValueError(f"工具 {name} 的 timeout 参数无效（{timeout_value}），必须大于0")
            else:
                raise ValueError(
                    f"工具 {name} 的 timeout 参数类型错误：期望 int 或 'auto'，实际 {type(timeout_value).__name__}"
                )
            
            enabled_tools[name] = config
    
    logger.info(f"扫描类型: {scan_type}, 启用工具: {len(enabled_tools)}/{len(tools)}")
    
    return enabled_tools
