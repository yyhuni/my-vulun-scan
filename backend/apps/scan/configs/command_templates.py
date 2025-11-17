"""
扫描工具命令模板

定义所有扫描工具的命令模板。

架构：
- 基础命令：必需参数的命令模板（如 subfinder -d {target} -o {output_file}）
- 可选参数：用户配置中存在才拼接（如 threads: 10 → -t 10）
- YAML 配置：提供所有参数值和超时时间
"""

import os

# ==================== 路径配置 ====================
# 扫描工具基础路径（支持环境变量配置）
SCAN_TOOLS_BASE_PATH = os.getenv('SCAN_TOOLS_PATH', '/opt/github')

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
        'command': f'python3 {SCAN_TOOLS_BASE_PATH}/Sublist3r/sublist3r.py -d {{target}} -o {{output_file}}',
        'optional_flags': {
            'threads': '-t {threads}',
        }
    },
    
    'oneforall': {
        'command': f'python3 {SCAN_TOOLS_BASE_PATH}/OneForAll/oneforall.py --target {{target}} run && cut -d\',\' -f6 {SCAN_TOOLS_BASE_PATH}/OneForAll/results/{{target}}.csv | tail -n +2 > {{output_file}} && rm -rf {SCAN_TOOLS_BASE_PATH}/OneForAll/results/{{target}}.csv',
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
        # 流式输出到 stdout，无需 -o 参数
        # 输出格式：JSON（-json），每行一个站点结果
        'command': '$HOME/go/bin/httpx -l {target_file} -status-code -content-type -content-length -location -title -server -body-preview -tech-detect -cdn -vhost -random-agent -no-color -json',
        'optional_flags': {
            'threads': '-threads {threads}',
            'rate_limit': '-rate-limit {rate_limit}',
            'request_timeout': '-timeout {request_timeout}',  # httpx 单个请求的超时时间（秒）
            'retries': '-retries {retries}',
        }
    },
}


# ==================== 目录扫描 ====================

DIRECTORY_SCAN_COMMANDS = {
    'ffuf': {
        # 流式输出到 stdout，使用 -json 输出 JSON 格式
        # 扫描目标 URL 的目录，使用 FUZZ 关键字作为字典替换位置
        'command': 'ffuf -u {url}/FUZZ -se -ac -json',
        'optional_flags': {
            'wordlist': '-w {wordlist}',                 # 词表文件路径（必需）
            'delay': '-p {delay}',                       # Seconds of `delay` between requests, or a range of random delay. For example "0.1" or "0.1-2.0"
            'threads': '-t {threads}',                   # Number of concurrent threads. (default: 40)
            'request_timeout': '-timeout {request_timeout}',  # HTTP request timeout in seconds. (default: 10)
            'match_codes': '-mc {match_codes}',          # 匹配的状态码（如 200,201,301,302,401,403）
            'rate': '-rate {rate}',                      # Rate of requests per second (default: 0)
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
