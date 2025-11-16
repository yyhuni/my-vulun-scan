"""
命令构建辅助函数

基于命令模板和用户配置构建完整的扫描命令。
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def build_tool_command(
    tool_name: str,
    scan_type: str,
    command_params: Dict[str, Any],
    tool_config: Dict[str, Any]
) -> str:
    """构建工具命令"""
    from apps.scan.configs.command_templates import get_command_template
    
    # 获取命令模板
    template = get_command_template(scan_type, tool_name)
    if not template:
        raise ValueError(f"未找到工具 {tool_name} 的命令模板（扫描类型: {scan_type}）")
    
    # 构建基础命令
    command_parts = [template['command']]
    
    # 拼接可选参数
    for flag_name, flag_template in template.get('optional_flags', {}).items():
        if param_value := tool_config.get(flag_name):
            command_parts.append(flag_template)
    
    # 格式化命令（替换占位符）
    command_template = ' '.join(command_parts)
    all_params = {**command_params, **tool_config}
    
    try:
        return command_template.format(**all_params)
    except KeyError as e:
        raise ValueError(f"命令构建失败，缺少必需参数: {e}")
