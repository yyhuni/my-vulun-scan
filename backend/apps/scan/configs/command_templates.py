"""
扫描工具命令模板（简化版，不使用 Jinja2）

使用 Python 原生字符串格式化，零依赖。
"""

import os

# ==================== 路径配置 ====================
SCAN_TOOLS_BASE_PATH = os.getenv('SCAN_TOOLS_PATH', '/opt/github')

# ==================== 子域名发现 ====================

SUBDOMAIN_DISCOVERY_COMMANDS = {
    'subfinder': {
        'base': 'subfinder -d {domain} -o {output_file} -silent',
        'optional': {
            'threads': '-t {threads}'
        }
    },
    
    'amass_passive': {
        'base': 'amass enum -passive -d {domain} -o {output_file}'
    },
    
    'amass_active': {
        'base': 'amass enum -active -d {domain} -o {output_file} -brute',
        'optional': {
            'wordlist': '-w {wordlist}'
        }
    },
    
    'sublist3r': {
        'base': 'python3 {scan_tools_base}/Sublist3r/sublist3r.py -d {domain} -o {output_file}',
        'optional': {
            'threads': '-t {threads}'
        }
    },
    
    'oneforall': {
        'base': (
            'python3 {scan_tools_base}/OneForAll/oneforall.py --target {domain} run && '
            "cut -d',' -f6 {scan_tools_base}/OneForAll/results/{domain}.csv | tail -n +2 > {output_file} && "
            'rm -rf {scan_tools_base}/OneForAll/results/{domain}.csv'
        )
    },
}


# ==================== 端口扫描 ====================

PORT_SCAN_COMMANDS = {
    'naabu_active': {
        'base': 'naabu -exclude-cdn -warm-up-time 5 -retries 1 -verify -timeout 5000 -list {domains_file} -json -silent',
        'optional': {
            'threads': '-c {threads}',
            'ports': '-p {ports}',
            'top-ports': '-top-ports {top-ports}',
            'rate': '-rate {rate}'
        }
    },
    
    'naabu_passive': {
        'base': 'naabu -list {domains_file} -passive -json -silent'
    },
}


# ==================== 站点扫描 ====================

SITE_SCAN_COMMANDS = {
    'httpx': {
        'base': (
            '$HOME/go/bin/httpx -l {target_file} '
            '-status-code -content-type -content-length '
            '-location -title -server -body-preview '
            '-tech-detect -cdn -vhost '
            '-random-agent -no-color -json'
        ),
        'optional': {
            'threads': '-threads {threads}',
            'rate-limit': '-rate-limit {rate-limit}',
            'request-timeout': '-timeout {request-timeout}',
            'retries': '-retries {retries}'
        }
    },
}


# ==================== 目录扫描 ====================

DIRECTORY_SCAN_COMMANDS = {
    'ffuf': {
        'base': 'ffuf -u {url}/FUZZ -se -ac -sf -json -w {wordlist}',
        'optional': {
            'delay': '-p {delay}',
            'threads': '-t {threads}',
            'request-timeout': '-timeout {request-timeout}',
            'match-codes': '-mc {match-codes}',
            'rate': '-rate {rate}'
        }
    },
}


# ==================== URL 获取 ====================

URL_FETCH_COMMANDS = {
    'waymore': {
        'base': 'waymore -i {target} -mode U -oU {output_file}',
        'input_type': 'domain'
    },
    
    'katana': {
        'base': '$HOME/go/bin/katana -u {url} -o {output_file} -silent -jsonl',
        'optional': {
            'depth': '-d {depth}',
            'threads': '-c {threads}',
            'rate-limit': '-rl {rate-limit}'
        },
        'input_type': 'url'
    },
}


# ==================== 工具映射 ====================

COMMAND_TEMPLATES = {
    'subdomain_discovery': SUBDOMAIN_DISCOVERY_COMMANDS,
    'port_scan': PORT_SCAN_COMMANDS,
    'site_scan': SITE_SCAN_COMMANDS,
    'directory_scan': DIRECTORY_SCAN_COMMANDS,
    'url_fetch': URL_FETCH_COMMANDS,
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
