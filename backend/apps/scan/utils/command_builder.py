"""
命令构建工具

统一管理扫描工具的命令模板解析和变量替换
"""

import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class _CommandBuilder:
    """
    扫描命令构建器
    
    职责：
    1. 解析命令模板中的变量占位符
    2. 替换为实际的值
    3. 验证必需的变量是否提供
    4. 生成最终可执行的命令
    
    使用示例：
        builder = _CommandBuilder()
        
        # 基本用法
        cmd = builder.build(
            template='naabu -list {target_file} -json',
            target_file='/path/to/domains.txt'
        )
        
        # 带验证
        cmd = builder.build(
            template='amass enum -d {target} -o {output_file}',
            required_vars=['target', 'output_file'],
            target='example.com',
            output_file='/path/to/output.txt'
        )
    """
    
    def build(
        self,
        template: str,
        required_vars: Optional[list[str]] = None,
        **variables
    ) -> str:
        """
        构建命令
        
        Args:
            template: 命令模板，使用 {变量名} 作为占位符
            required_vars: 必需的变量列表，如果未提供则自动检测
            **variables: 要替换的变量键值对
            
        Returns:
            str: 替换后的完整命令
            
        Raises:
            ValueError: 缺少必需的变量
            KeyError: 模板中的变量在 variables 中不存在
            
        Examples:
            >>> builder = _CommandBuilder()
            >>> builder.build(
            ...     template='echo {message}',
            ...     message='Hello World'
            ... )
            'echo Hello World'
            
            >>> builder.build(
            ...     template='naabu -list {target_file} -json',
            ...     target_file='/tmp/domains.txt'
            ... )
            'naabu -list /tmp/domains.txt -json'
        """
        # 1. 提取模板中的所有变量
        template_vars = self._extract_variables(template)
        
        # 2. 如果没有指定 required_vars，则所有模板变量都是必需的
        if required_vars is None:
            required_vars = template_vars
        
        # 3. 验证必需的变量是否都提供了
        missing_vars = [var for var in required_vars if var not in variables]
        if missing_vars:
            raise ValueError(
                f"缺少必需的变量: {', '.join(missing_vars)}\n"
                f"模板: {template}\n"
                f"提供的变量: {list(variables.keys())}"
            )
        
        # 4. 验证提供的变量是否在模板中存在（避免拼写错误）
        extra_vars = [var for var in variables.keys() if var not in template_vars]
        if extra_vars:
            logger.warning(
                "提供了模板中不存在的变量: %s (模板变量: %s)",
                ', '.join(extra_vars),
                ', '.join(template_vars)
            )
        
        # 5. 转换 Path 对象为字符串
        processed_vars = {}
        for key, value in variables.items():
            if isinstance(value, Path):
                processed_vars[key] = str(value)
            else:
                processed_vars[key] = value
        
        # 6. 替换变量
        try:
            command = template.format(**processed_vars)
            logger.debug("命令构建成功: %s", command)
            return command
        except KeyError as e:
            raise KeyError(
                f"模板变量 {e} 未提供\n"
                f"模板: {template}\n"
                f"提供的变量: {list(processed_vars.keys())}"
            ) from e
    
    def _extract_variables(self, template: str) -> list[str]:
        """
        从模板中提取所有变量名
        
        Args:
            template: 命令模板
            
        Returns:
            list[str]: 变量名列表
            
        Examples:
            >>> builder = _CommandBuilder()
            >>> builder._extract_variables('echo {msg} to {file}')
            ['msg', 'file']
        """
        import re
        # 匹配 {变量名} 格式
        pattern = r'\{([^}]+)\}'
        variables = re.findall(pattern, template)
        return variables


# 内部单例实例（不对外暴露）
_command_builder = _CommandBuilder()


def build_command(template: str, **variables) -> str:
    """
    快捷函数：构建命令
    
    这是 _CommandBuilder.build() 的快捷方式
    
    Args:
        template: 命令模板
        **variables: 要替换的变量
        
    Returns:
        str: 替换后的命令
        
    Examples:
        >>> from apps.scan.utils.command_builder import build_command
        >>> build_command(
        ...     'amass enum -d {target} -o {output}',
        ...     target='example.com',
        ...     output='/tmp/result.txt'
        ... )
        'amass enum -d example.com -o /tmp/result.txt'
    """
    return _command_builder.build(template, **variables)


# ==================== 扫描工具专用命令构建 ====================

def build_scan_command(
    tool_name: str,
    scan_type: str,
    command_params: Dict[str, Any],
    tool_config: Dict[str, Any]
) -> str:
    """
    构建扫描工具命令（结合命令模板 + 可选参数）
    
    Args:
        tool_name: 工具名称（如 'subfinder'）
        scan_type: 扫描类型（如 'subdomain_discovery'）
        command_params: 命令占位符参数
            - target: 扫描目标
            - output_file: 输出文件路径
            - target_file: 目标文件路径
        tool_config: 工具配置参数（包含可选参数）
            - threads: 线程数
            - tool_timeout: Flow 超时（会被忽略）
            - tool_enabled: 启用状态（会被忽略）
    
    Returns:
        完整的命令字符串
    
    Example:
        >>> build_scan_command(
        ...     tool_name='subfinder',
        ...     scan_type='subdomain_discovery',
        ...     command_params={'target': 'example.com', 'output_file': '/tmp/out.txt'},
        ...     tool_config={'threads': 10}
        ... )
        'subfinder -d example.com -o /tmp/out.txt -t 10 -silent'
    """
    from apps.scan.configs.command_templates import get_command_template
    
    # 获取命令模板
    template = get_command_template(scan_type, tool_name)
    if not template:
        raise ValueError(f"未找到工具 {tool_name} 的命令模板（扫描类型: {scan_type}）")
    
    # 构建基础命令
    command_parts = [template['command']]
    
    # 拼接可选参数
    for flag_name, flag_template in template.get('optional_flags', {}).items():
        param_value = tool_config.get(flag_name)
        if param_value is not None and param_value != '':
            command_parts.append(flag_template)
    
    # 格式化命令（替换占位符）
    command_template = ' '.join(command_parts)
    all_params = {**command_params, **tool_config}
    
    try:
        return command_template.format(**all_params)
    except KeyError as e:
        raise ValueError(f"命令构建失败，缺少必需参数: {e}")
