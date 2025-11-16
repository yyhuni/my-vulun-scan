"""
配置解析器

负责解析引擎配置（YAML）并提取启用的工具及其配置。

架构说明：
- 命令模板：在 command_templates.py 中定义（基础命令 + 可选参数映射）
- 工具配置：从引擎配置（engine_config YAML 字符串）读取
- 无默认配置文件：所有配置必须在引擎配置中提供

核心方法：
- parse_engine_config(): 解析 YAML 字符串
- parse_enabled_tools(): 解析并过滤启用的工具，返回工具配置字典

返回格式：
- {'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600}}
- timeout 是必需参数，不提供会报错
"""

import yaml
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class _ScannerConfigParser:
    """
    扫描配置解析器
    
    职责：
    - 解析引擎配置（YAML 字符串）
    - 提取启用的工具配置
    - 过滤工具启用状态
    
    不负责：
    - 命令构建（在工具类中）
    - 默认配置管理（工具类自带默认值）
    """
    
    def parse_engine_config(self, engine_config_str: Optional[str]) -> Dict[str, Any]:
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
        self,
        scan_type: str,
        engine_config_str: Optional[str] = None
    ) -> Dict[str, Dict[str, Any]]:
        """
        解析 YAML 配置，获取启用的工具及其配置
        
        Args:
            scan_type: 扫描类型
            engine_config_str: 引擎配置（YAML 字符串）
        
        Returns:
            启用的工具配置字典 {tool_name: tool_config}
            例如: {'subfinder': {'enabled': True, 'threads': 10, 'timeout': 600}}
        
        Note:
            返回的是工具配置字典，不是工具名列表。
            命令构建逻辑在 command_helper 中实现。
        """
        if not engine_config_str:
            # 没有配置 → 返回空字典，不执行任何工具
            logger.warning(f"没有引擎配置，{scan_type} 不会执行任何工具")
            return {}
        
        # 直接使用引擎配置
        engine_config = self.parse_engine_config(engine_config_str)
        scan_config = engine_config.get(scan_type, {})
        
        if not scan_config:
            logger.warning(f"引擎配置中没有 {scan_type} 配置")
            return {}
        
        tools = scan_config.get('tools', {})
        
        if not tools:
            logger.warning(f"{scan_type} 配置中没有工具列表")
            return {}
        
        # 过滤启用的工具（必须明确配置 enabled）
        enabled_tools = {}
        for name, config in tools.items():
            # 检查是否配置了 enabled
            if 'enabled' not in config:
                logger.warning(f"工具 {name} 缺少 enabled 配置，跳过")
                continue
            
            # 只添加 enabled=true 的工具
            if config.get('enabled') is True:
                enabled_tools[name] = config
        
        logger.info(
            f"扫描类型: {scan_type}, "
            f"启用工具: {len(enabled_tools)}/{len(tools)}"
        )
        
        return enabled_tools


# ==================== 内部单例（不对外暴露）====================
_config_parser = _ScannerConfigParser()


