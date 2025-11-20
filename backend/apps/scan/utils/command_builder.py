"""
命令构建工具（基于 Jinja2）

提供扫描工具命令字符串构建功能，使用 Jinja2 模板引擎。
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

def build_scan_command(
    tool_name: str,
    scan_type: str,
    command_params: Dict[str, Any],
    tool_config: Dict[str, Any]
) -> str:
    """
    构建扫描工具命令（使用 Jinja2 模板渲染）
    
    Args:
        tool_name: 工具名称（如 'subfinder'）
        scan_type: 扫描类型（如 'subdomain_discovery'）
        command_params: 命令占位符参数
            - domain: 目标域名
            - target_file: 目标文件路径
            - output_file: 输出文件路径
        tool_config: 工具配置参数（包含可选参数）
            - threads: 线程数
            - timeout: 超时时间（秒）
    
    Returns:
        完整的命令字符串
    
    Example:
        >>> build_scan_command(
        ...     tool_name='subfinder',
        ...     scan_type='subdomain_discovery',
        ...     command_params={'domain': 'example.com', 'output_file': '/tmp/out.txt'},
        ...     tool_config={'threads': 10}
        ... )
        'subfinder -d example.com -o /tmp/out.txt -t 10 -silent'
    
    Note:
        - 使用 Jinja2 模板引擎渲染命令
        - scan_tools_base 参数自动注入
        - StrictUndefined 模式：缺少必需参数时自动报错
    """
    from jinja2 import Template, StrictUndefined
    from apps.scan.configs.command_templates import get_command_template, SCAN_TOOLS_BASE_PATH
    
    # 获取命令模板
    template = get_command_template(scan_type, tool_name)
    if not template:
        raise ValueError(f"未找到工具 {tool_name} 的命令模板（扫描类型: {scan_type}）")
    
    # 添加系统默认参数
    default_params = {'scan_tools_base': SCAN_TOOLS_BASE_PATH}
    
    # 合并所有参数（Jinja2 会自动处理条件和未使用的参数）
    all_params = {**default_params, **command_params, **tool_config}
    
    try:
        # 使用 Jinja2 渲染命令（StrictUndefined: 缺少变量时自动报错）
        jinja_template = Template(template['command'], undefined=StrictUndefined)
        rendered_command = jinja_template.render(**all_params)
        
        # 清理多余空白（多行字符串会产生多余的空格和换行）
        import re
        # 1. 将多个空白字符（空格、制表符、换行）压缩为单个空格
        cleaned_command = re.sub(r'\s+', ' ', rendered_command)
        # 2. 去除首尾空白
        return cleaned_command.strip()
    except Exception as e:
        raise ValueError(
            f"命令构建失败: {e}\n"
            f"模板: {template['command']}\n"
            f"提供的参数: {list(all_params.keys())}"
        )
