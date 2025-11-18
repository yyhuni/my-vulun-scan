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
from typing import Dict, Any, Optional, Callable

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
    engine_config: str,
    timeout_calculator: Optional[Callable[..., int]] = None,
    timeout_calculator_kwargs: Optional[Dict[str, Any]] = None
) -> Dict[str, Dict[str, Any]]:
    """
    解析 YAML 配置，获取启用的工具及其配置
    
    Args:
        scan_type: 扫描类型 (subdomain_discovery, port_scan, site_scan, directory_scan)
        engine_config: 引擎配置（YAML 字符串，必需）
        timeout_calculator: 超时时间计算回调函数（可选）
                          当 timeout 配置为 "auto" 时，调用此函数计算实际超时时间
        timeout_calculator_kwargs: 传递给 timeout_calculator 的参数字典（可选）
    
    Returns:
        启用的工具配置字典 {tool_name: tool_config}
        例如: {
            'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600},
            'amass_passive': {'enabled': True, 'timeout': 300}
        }
    
    Raises:
        ValueError: 配置格式错误或必需参数缺失/无效时抛出
        - engine_config 为空或空白字符串
        - 工具配置不是字典类型
        - enabled 字段类型不是 bool
        - enabled=true 但缺少 timeout 参数
        - timeout 参数类型不是 int 或 "auto"
        - timeout 参数值 <= 0
        - timeout="auto" 但未提供 timeout_calculator
    
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
    # 参数验证
    if not engine_config or not engine_config.strip():
        raise ValueError(f"engine_config 不能为空 - scan_type: {scan_type}")
    
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
            
            # 支持 timeout: auto（动态计算超时时间）
            if timeout_value == 'auto':
                if not timeout_calculator:
                    raise ValueError(
                        f"工具 {name} 的 timeout 配置为 'auto'，但未提供 timeout_calculator 回调函数"
                    )
                
                # 调用回调函数计算实际的 timeout
                try:
                    # 使用 kwargs 调用计算函数，并传入工具配置
                    kwargs = timeout_calculator_kwargs or {}
                    calculated_timeout = timeout_calculator(tool_config=config, **kwargs)
                    
                    if not isinstance(calculated_timeout, int) or calculated_timeout <= 0:
                        raise ValueError(
                            f"timeout_calculator 返回的值无效（{calculated_timeout}），必须是大于0的整数"
                        )
                    # 将计算出的 timeout 写回配置
                    config = dict(config)  # 创建副本避免修改原始配置
                    config['timeout'] = calculated_timeout
                    logger.debug(f"工具 {name} 的 timeout 自动计算为: {calculated_timeout}秒")
                except Exception as e:
                    raise ValueError(
                        f"工具 {name} 调用 timeout_calculator 失败: {e}"
                    ) from e
            
            # 验证 timeout 是整数且大于0
            elif isinstance(timeout_value, int):
                if timeout_value <= 0:
                    raise ValueError(
                        f"工具 {name} 的 timeout 参数无效（{timeout_value}），必须大于0"
                    )
            else:
                raise ValueError(
                    f"工具 {name} 的 timeout 参数类型错误：期望 int 或 'auto'，实际 {type(timeout_value).__name__}"
                )
            
            enabled_tools[name] = config
    
    logger.info(
        f"扫描类型: {scan_type}, "
        f"启用工具: {len(enabled_tools)}/{len(tools)}"
    )
    
    return enabled_tools
