"""
子域名发现工具定义

每个工具包含：
- 命令构建逻辑
- 支持的参数
- 默认配置

技术细节在代码中，配置值在 YAML 中
"""

from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class SubdomainTool(ABC):
    """子域名工具基类"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化工具
        
        Args:
            config: 工具配置（来自 YAML）
        """
        self.config = config
    
    @property
    @abstractmethod
    def name(self) -> str:
        """工具名称"""
        pass
    
    @property
    def default_timeout(self) -> int:
        """默认超时时间（秒）"""
        return 600
    
    @abstractmethod
    def build_command(
        self,
        target: str,
        output_file: str,
        **kwargs
    ) -> str:
        """
        构建命令
        
        Args:
            target: 目标域名
            output_file: 输出文件
            **kwargs: 其他参数（proxy, threads, wordlist 等）
        
        Returns:
            完整命令字符串
        """
        pass
    
    def get_timeout(self) -> int:
        """获取超时时间"""
        return self.config.get('timeout', self.default_timeout)
    
    def is_enabled(self) -> bool:
        """是否启用"""
        return self.config.get('enabled', True)


class SubfinderTool(SubdomainTool):
    """Subfinder 工具"""
    
    @property
    def name(self) -> str:
        return 'subfinder'
    
    @property
    def default_timeout(self) -> int:
        """默认超时 10 分钟"""
        return 600
    
    @property
    def default_threads(self) -> int:
        """默认线程数"""
        return 10
    
    def build_command(
        self,
        target: str,
        output_file: str,
        use_proxy: bool = True,
        threads: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        构建 subfinder 命令
        
        Args:
            target: 目标域名
            output_file: 输出文件
            use_proxy: 是否使用代理（默认 True）
            threads: 线程数（可选，默认 10）
        
        示例：
        - 基础: subfinder -d example.com -o /tmp/out.txt -silent
        - 代理: subfinder -d example.com -o /tmp/out.txt -proxy http://proxy:8080 -silent
        - 线程: subfinder -d example.com -o /tmp/out.txt -t 10 -silent
        
        Note: 代理由代理池管理系统提供（apps/proxy/）
        """
        parts = [
            'subfinder',
            f'-d {target}',
            f'-o {output_file}',
        ]
        
        # 可选参数：代理（从代理池获取）
        if use_proxy:
            # TODO: 接入代理池管理系统
            # from apps.proxy.services import proxy_pool
            # proxy = proxy_pool.get_proxy()
            # if proxy:
            #     parts.append(f'-proxy {proxy}')
            pass
        
        # 可选参数：threads（使用配置值或默认值）
        thread_count = threads if threads is not None else self.default_threads
        parts.append(f'-t {thread_count}')
        
        parts.append('-silent')
        
        return ' '.join(parts)


class AmassPassiveTool(SubdomainTool):
    """Amass Passive 工具"""
    
    @property
    def name(self) -> str:
        return 'amass_passive'
    
    @property
    def default_timeout(self) -> int:
        return 600
    
    def build_command(
        self,
        target: str,
        output_file: str,
        timeout: Optional[int] = None,
        **kwargs
    ) -> str:
        """构建 amass passive 命令"""
        parts = [
            'amass enum -passive',
            f'-d {target}',
            f'-o {output_file}',
        ]
        
        # 可选参数：timeout
        if timeout:
            parts.append(f'-timeout {timeout}')
        
        return ' '.join(parts)


class AmassActiveTool(SubdomainTool):
    """Amass Active 工具"""
    
    @property
    def name(self) -> str:
        return 'amass_active'
    
    @property
    def default_timeout(self) -> int:
        """默认超时 30 分钟（主动扫描+暴力破解耗时长）"""
        return 1800
    
    @property
    def default_wordlist(self) -> str:
        """默认字典"""
        return '/usr/src/wordlist/deepmagic.com-prefixes-top50000.txt'
    
    def build_command(
        self,
        target: str,
        output_file: str,
        wordlist: Optional[str] = None,
        timeout: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        构建 amass active 命令
        
        Args:
            target: 目标域名
            output_file: 输出文件
            wordlist: 字典文件（可选，默认使用 deepmagic.com-prefixes-top50000.txt）
            timeout: 超时时间（可选）
        """
        parts = [
            'amass enum -active',
            f'-d {target}',
            f'-o {output_file}',
            '-brute',
        ]
        
        # 可选参数：wordlist（使用配置值或默认值）
        wordlist_path = wordlist if wordlist else self.default_wordlist
        parts.append(f'-w {wordlist_path}')
        
        # 可选参数：timeout
        if timeout:
            parts.append(f'-timeout {timeout}')
        
        return ' '.join(parts)


class Sublist3rTool(SubdomainTool):
    """Sublist3r 工具"""
    
    @property
    def name(self) -> str:
        return 'sublist3r'
    
    @property
    def default_timeout(self) -> int:
        """默认超时 15 分钟"""
        return 900
    
    @property
    def default_threads(self) -> int:
        """默认线程数"""
        return 50
    
    def build_command(
        self,
        target: str,
        output_file: str,
        threads: Optional[int] = None,
        **kwargs
    ) -> str:
        """
        构建 sublist3r 命令
        
        Args:
            target: 目标域名
            output_file: 输出文件
            threads: 线程数（可选，默认 50）
        """
        parts = [
            'python3 /usr/src/github/Sublist3r/sublist3r.py',
            f'-d {target}',
            f'-o {output_file}',
        ]
        
        # 可选参数：threads（使用配置值或默认值）
        thread_count = threads if threads is not None else self.default_threads
        parts.append(f'-t {thread_count}')
        
        return ' '.join(parts)


class OneForAllTool(SubdomainTool):
    """OneForAll 工具"""
    
    @property
    def name(self) -> str:
        return 'oneforall'
    
    @property
    def default_timeout(self) -> int:
        """默认超时 20 分钟（OneForAll 功能全面但耗时）"""
        return 1200
    
    def build_command(
        self,
        target: str,
        output_file: str,
        **kwargs
    ) -> str:
        """
        构建 oneforall 命令
        
        Args:
            target: 目标域名
            output_file: 输出文件
        
        Note: OneForAll 会生成 CSV 文件，需要提取第 6 列（域名）并清理临时文件
        """
        return (
            f"python3 /usr/src/github/OneForAll/oneforall.py --target {target} run && "
            f"cut -d',' -f6 /usr/src/github/OneForAll/results/{target}.csv | tail -n +2 > {output_file} && "
            f"rm -rf /usr/src/github/OneForAll/results/{target}.csv"
        )


# ==================== 工具注册表 ====================

SUBDOMAIN_TOOLS = {
    'subfinder': SubfinderTool,
    'amass_passive': AmassPassiveTool,
    'amass_active': AmassActiveTool,
    'sublist3r': Sublist3rTool,
    'oneforall': OneForAllTool,
}


def get_tool_instance(tool_name: str, config: Dict[str, Any]) -> SubdomainTool:
    """
    获取工具实例
    
    Args:
        tool_name: 工具名称
        config: 工具配置
    
    Returns:
        工具实例
    
    Raises:
        ValueError: 工具不存在
    """
    tool_class = SUBDOMAIN_TOOLS.get(tool_name)
    if not tool_class:
        raise ValueError(f"未知的工具: {tool_name}")
    
    return tool_class(config)


def get_available_tools() -> Dict[str, type]:
    """获取所有可用工具"""
    return SUBDOMAIN_TOOLS.copy()
