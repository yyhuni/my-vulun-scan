"""
工作流编排器

职责：
- 解析 YAML 配置
- 检测扫描类型
- 提供 Flow 函数映射
- 生成执行计划

注意：本类只负责准备和解析，不执行 Flow
Flow 的执行由 initiate_scan_flow (Prefect @flow) 负责
"""

import logging
import yaml
from typing import Dict, List, Optional, Callable

logger = logging.getLogger(__name__)


class FlowOrchestrator:
    """
    工作流编排器
    
    负责解析 YAML 配置并生成执行计划，不执行具体的 Flow
    """
    
    # 支持的扫描类型
    SUPPORTED_SCAN_TYPES = [
        'subdomain_discovery',
        'port_scan',
        'site_scan',
        'directory_scan',
    ]
    
    def __init__(self, engine_config: str):
        """
        初始化编排器
        
        Args:
            engine_config: YAML 格式的引擎配置字符串
        
        Raises:
            ValueError: 配置为空或解析失败
        """
        self.raw_config = engine_config
        self.config = self._parse_config(engine_config)
        self.scan_types = self._detect_scan_types()
    
    def _parse_config(self, engine_config: str) -> Dict:
        """
        解析 YAML 配置
        
        Args:
            engine_config: YAML 格式字符串
        
        Returns:
            dict: 解析后的配置字典
        
        Raises:
            ValueError: 配置为空或解析失败
        """
        if not engine_config:
            raise ValueError("引擎配置为空，请提供有效的 YAML 配置")
        
        try:
            config = yaml.safe_load(engine_config)
            if not config:
                raise ValueError("YAML 配置解析结果为空")
            
            logger.info(f"YAML 配置解析成功，检测到的 key: {list(config.keys())}")
            return config
            
        except yaml.YAMLError as e:
            raise ValueError(f"YAML 配置解析失败: {e}")
    
    def _detect_scan_types(self) -> List[str]:
        """
        检测配置中的扫描类型（按 YAML 顺序）
        
        Returns:
            list: 扫描类型列表（按 YAML 中的顺序）
        
        Raises:
            ValueError: 未检测到有效的扫描类型
        """
        # 保持 YAML 中的顺序
        scan_types = [
            key for key in self.config.keys() 
            if key in self.SUPPORTED_SCAN_TYPES
        ]
        
        if not scan_types:
            raise ValueError(
                f"未检测到有效的扫描类型。\n"
                f"配置中的 key: {list(self.config.keys())}\n"
                f"支持的扫描类型: {self.SUPPORTED_SCAN_TYPES}"
            )
        
        logger.info(f"检测到的扫描类型（按顺序）: {scan_types}")
        return scan_types
    
    def get_flow_function(self, scan_type: str) -> Optional[Callable]:
        """
        获取指定扫描类型的 Flow 函数（延迟导入）
        
        Args:
            scan_type: 扫描类型
        
        Returns:
            Callable: Flow 函数，如果未实现则返回 None
        """
        if scan_type == 'subdomain_discovery':
            from apps.scan.flows.subdomain_discovery_flow import subdomain_discovery_flow
            return subdomain_discovery_flow
        
        elif scan_type == 'port_scan':
            from apps.scan.flows.port_scan_flow import port_scan_flow
            return port_scan_flow
        
        elif scan_type == 'site_scan':
            from apps.scan.flows.site_scan_flow import site_scan_flow
            return site_scan_flow
        
        elif scan_type == 'directory_scan':
            from apps.scan.flows.directory_scan_flow import directory_scan_flow
            return directory_scan_flow
        
        else:
            logger.warning(f"未实现的扫描类型: {scan_type}")
            return None
    
    def iter_flows(self):
        """
        迭代器：遍历所有需要执行的 Flow
        
        Yields:
            tuple: (scan_type, flow_func)
            
        Example:
            for scan_type, flow_func in orchestrator.iter_flows():
                if flow_func:
                    flow_func(...)
        """
        for scan_type in self.scan_types:
            flow_func = self.get_flow_function(scan_type)
            yield scan_type, flow_func
    
    def validate(self) -> Dict:
        """
        验证配置完整性
        
        Returns:
            dict: {
                'valid': bool,
                'scan_types': list,
                'warnings': list,
                'errors': list
            }
        """
        warnings = []
        errors = []
        
        # 检查每个扫描类型是否有工具配置
        for scan_type in self.scan_types:
            scan_config = self.config.get(scan_type, {})
            tools = scan_config.get('tools', {})
            
            if not tools:
                warnings.append(f"{scan_type} 没有配置工具")
            else:
                # 检查是否有启用的工具
                enabled_tools = [
                    tool_name for tool_name, tool_config in tools.items()
                    if tool_config.get('enabled', False)
                ]
                
                if not enabled_tools:
                    warnings.append(f"{scan_type} 没有启用的工具")
        
        return {
            'valid': len(errors) == 0,
            'scan_types': self.scan_types,
            'warnings': warnings,
            'errors': errors
        }


# 便捷函数：快速解析配置
def parse_engine_config(engine_config: str) -> FlowOrchestrator:
    """
    快速创建 FlowOrchestrator 实例
    
    Args:
        engine_config: YAML 格式的引擎配置
    
    Returns:
        FlowOrchestrator: 编排器实例
    """
    return FlowOrchestrator(engine_config)
