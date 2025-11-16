"""
扫描工具命令模板

定义所有扫描工具的命令模板。

架构：
- 基础命令：必需参数的命令模板（如 subfinder -d {target} -o {output_file}）
- 可选参数：用户配置中存在才拼接（如 threads: 10 → -t 10）
- YAML 配置：提供所有参数值和超时时间
"""

# ==================== 子域名发现 ====================

SUBDOMAIN_DISCOVERY_COMMANDS = {
    'subfinder': {
        'command': 'subfinder -d {target} -o {output_file} -silent',
        'optional_flags': {
            'threads': '-t {threads}',
        }
    },
    
    'amass_passive': {
        'command': 'amass enum -passive -d {target} -o {output_file}',
        'optional_flags': {}
    },
    
    'amass_active': {
        'command': 'amass enum -active -d {target} -o {output_file} -brute',
        'optional_flags': {
            'wordlist': '-w {wordlist}',
        }
    },
    
    'sublist3r': {
        'command': 'python3 /opt/github/Sublist3r/sublist3r.py -d {target} -o {output_file}',
        'optional_flags': {
            'threads': '-t {threads}',
        }
    },
    
    'oneforall': {
        'command': 'python3 /opt/github/OneForAll/oneforall.py --target {target} run && cut -d\',\' -f6 /opt/github/OneForAll/results/{target}.csv | tail -n +2 > {output_file} && rm -rf /opt/github/OneForAll/results/{target}.csv',
        'optional_flags': {}
    },
}


# ==================== 端口扫描 ====================

PORT_SCAN_COMMANDS = {
    'naabu_active': {
        'command': 'naabu -exclude-cdn -warm-up-time 5 -retries 1 -verify -timeout 5000 -list {target_file} -json -silent',
        'optional_flags': {
            'threads': '-c {threads}',
            'ports': '-p {ports}',
            'rate': '-rate {rate}',
        }
    },
    
    'naabu_passive': {
        'command': 'naabu -list {target_file} -passive -json -silent',
        'optional_flags': {}
    },
}


# ==================== 站点扫描 ====================

SITE_SCAN_COMMANDS = {
    'httpx': {
        'command': 'httpx -l {input_file} -o {output_file} -json -silent',
        'optional_flags': {
            'threads': '-threads {threads}',
            'timeout': '-timeout {timeout}',
            'retries': '-retries {retries}',
            'use_proxy': '-http-proxy {proxy_url}',
        }
    },
}


# ==================== 目录扫描 ====================

DIRECTORY_SCAN_COMMANDS = {
    'dirsearch': {
        'command': 'python3 /opt/github/dirsearch/dirsearch.py -u {target} -o {output_file}',
        'optional_flags': {
            'threads': '-t {threads}',
            'wordlist': '-w {wordlist}',
            'extensions': '-e {extensions}',
            'use_proxy': '--proxy {proxy_url}',
        }
    },
}


# ==================== 工具映射 ====================

COMMAND_TEMPLATES = {
    'subdomain_discovery': SUBDOMAIN_DISCOVERY_COMMANDS,
    'port_scan': PORT_SCAN_COMMANDS,
    'site_scan': SITE_SCAN_COMMANDS,
    'directory_scan': DIRECTORY_SCAN_COMMANDS,
}


def get_command_template(scan_type: str, tool_name: str) -> dict:
    """
    获取工具的命令模板
    
    Args:
        scan_type: 扫描类型
        tool_name: 工具名称
    
    Returns:
        命令模板字典，如果未找到则返回 None
    """
    templates = COMMAND_TEMPLATES.get(scan_type, {})
    return templates.get(tool_name)
