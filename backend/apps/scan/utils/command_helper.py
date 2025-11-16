"""
命令构建辅助函数

基于命令模板和用户配置构建完整的扫描命令。

架构说明：
- 命令模板（command_templates.py）：定义基础命令 + 可选参数映射
- 引擎配置（engine_config YAML）：提供所有参数值（enabled, timeout, threads 等）
- 无默认值：所有参数必须在引擎配置中提供，timeout 是必需的

数据流：
1. parse_and_build_commands() - 一步到位
2. └─ config_parser.parse_enabled_tools() - 解析 YAML，获取工具配置
3. └─ get_command_template() - 获取命令模板
4. └─ build_scan_command() - 拼接命令（基础命令 + 可选参数）
5. └─ get_timeout() - 获取超时（必需配置）
"""

import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


def build_scan_command(
    tool_name: str,
    command_template_config: Dict[str, Any],
    params: Dict[str, Any]
) -> str:
    """
    构建扫描命令（简化版）
    
    逻辑：
    1. 基础命令：subfinder -d {target} -o {output_file}
    2. 如果配置有参数（如 threads: 10），拼接到后面（-t 10）
    3. 格式化并返回完整命令
    
    Args:
        tool_name: 工具名称
        command_template_config: 命令模板配置，包含:
            - command: 基础命令模板（如 "subfinder -d {target} -o {output_file}"）
            - optional_flags: 可选参数映射（如 {'threads': '-t {threads}'}）
        params: 用户参数字典（来自 YAML 配置 + 运行时参数）
    
    Returns:
        完整的命令字符串
    
    Example:
        >>> template = {
        ...     'command': 'subfinder -d {target} -o {output_file}',
        ...     'optional_flags': {'threads': '-t {threads}'}
        ... }
        >>> params = {'target': 'example.com', 'output_file': 'out.txt', 'threads': 10}
        >>> build_scan_command('subfinder', template, params)
        'subfinder -d example.com -o out.txt -t 10'
    """
    # 1. 基础命令
    command_parts = [command_template_config['command']]
    
    # 2. 遍历可选参数，如果用户提供了就拼接
    optional_flags = command_template_config.get('optional_flags', {})
    
    for flag_name, flag_template in optional_flags.items():
        param_value = params.get(flag_name)
        
        # 有值才拼接（忽略 None、False、空字符串）
        if param_value:
            command_parts.append(flag_template)
            logger.debug(f"添加参数: {flag_name}={param_value}")
    
    # 3. 拼接命令模板
    full_command_template = ' '.join(command_parts)
    
    # 4. 格式化命令（替换占位符）
    try:
        full_command = full_command_template.format(**params)
        logger.debug(f"构建命令 [{tool_name}]: {full_command}")
        return full_command
    except KeyError as e:
        logger.error(f"命令模板缺少参数: {e}, 模板: {full_command_template}")
        raise ValueError(f"命令构建失败，缺少必需参数: {e}")


def get_timeout(tool_config: Dict[str, Any]) -> int:
    """
    获取超时时间（必需配置）
    
    Args:
        tool_config: 工具配置（来自 YAML）
    
    Returns:
        超时时间（秒）
    
    Raises:
        ValueError: 如果配置中缺少 timeout
    """
    if 'timeout' not in tool_config:
        raise ValueError("工具配置必须包含 timeout 参数")
    return tool_config['timeout']


def parse_and_build_commands(
    scan_type: str,
    engine_config: str,
    runtime_params: Dict[str, Any]
) -> List[Tuple[str, str, int, str, Dict[str, Any]]]:
    """
    解析 YAML 并构建所有启用工具的命令（一步到位）
    
    Args:
        scan_type: 扫描类型 (subdomain_discovery, port_scan, site_scan, directory_scan)
        engine_config: 引擎配置（YAML 字符串）
        runtime_params: 运行时参数，包含:
            - target: 扫描目标（必需）
            - output_path: 输出路径（必需，用于生成 output_file）
            - 其他工具参数
    
    Returns:
        List of (tool_name, command, timeout, output_file)
        
    Note:
        output_file 格式: {output_path}/{tool_name}_{timestamp}_{uuid}.txt
        timestamp 和 uuid 由函数自动生成
    
    Example:
        >>> commands = parse_and_build_commands(
        ...     'subdomain_discovery',
        ...     yaml_config,
        ...     {'target': 'example.com', 'output_path': '/tmp/scan_123'}
        ... )
        >>> for tool_name, command, timeout, output_file, config in commands:
        ...     run_task(command, timeout, output_file)
    """
    from apps.scan.utils.config_parser import _config_parser
    from apps.scan.configs.command_templates import get_command_template
    
    # 1. 解析 YAML，获取启用的工具及其配置
    enabled_tools = _config_parser.parse_enabled_tools(scan_type, engine_config)
    
    if not enabled_tools:
        logger.warning(f"没有启用的工具: {scan_type}")
        return []
    
    # 2. 遍历启用的工具，构建命令
    # enabled_tools 格式: {'subfinder': {'enabled': True, 'threads': 10, ...}}
    commands = []
    
    # 获取输出路径（必需参数）
    output_path = runtime_params.get('output_path')
    if not output_path:
        raise ValueError("runtime_params 必须包含 output_path")
    
    # 生成时间戳（所有工具共用）
    from datetime import datetime
    import uuid
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    for tool_name, tool_config in enabled_tools.items():
        try:
            # 获取命令模板
            command_template = get_command_template(scan_type, tool_name)
            if not command_template:
                logger.warning(f"未找到工具 {tool_name} 的命令模板，跳过")
                continue
            
            # 合并参数：运行时参数 + YAML 配置（排除控制字段）
            # 过滤掉 enabled、timeout、output_path（这些不是命令参数）
            tool_params = {
                k: v for k, v in tool_config.items() 
                if k not in ('enabled', 'timeout')
            }
            runtime_cmd_params = {
                k: v for k, v in runtime_params.items()
                if k != 'output_path'  # output_path 用于生成文件名，不传给命令
            }
            params = {
                **runtime_cmd_params,
                **tool_params
            }
            
            # 为每个工具生成唯一的输出文件
            short_uuid = uuid.uuid4().hex[:4]
            output_file = f"{output_path}/{tool_name}_{timestamp}_{short_uuid}.txt"
            params['output_file'] = output_file
            
            # 构建命令
            command = build_scan_command(tool_name, command_template, params)
            
            # 获取超时
            timeout = get_timeout(tool_config)
            
            # 返回: (tool_name, command, timeout, output_file)
            commands.append((tool_name, command, timeout, output_file))
            
            logger.debug(
                f"构建命令成功 [{tool_name}]: {command[:100]}... (timeout: {timeout}s)"
            )
            
        except Exception as e:
            logger.error(f"工具 {tool_name} 命令构建失败: {e}")
            continue
    
    logger.info(f"成功构建 {len(commands)}/{len(enabled_tools)} 个工具命令")
    return commands
