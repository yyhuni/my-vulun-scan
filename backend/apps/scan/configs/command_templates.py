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
        'base': 'naabu -exclude-cdn -warm-up-time 5 -verify -list {domains_file} -json -silent',
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
            '$HOME/go/bin/httpx -l {url_file} '
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
        'base': 'ffuf -u {url}FUZZ -se -ac -sf -json -w {wordlist}',  # 去掉 /，FUZZ 替换为完整路径（含开头斜杠）
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
        'base': 'waymore -i {domains_file} -mode U -oU {output_file}',
        'input_type': 'domains_file'
    },
    
    'katana': {
        'base': (
            '$HOME/go/bin/katana -list {sites_file} -o {output_file} '
            '-jc '                   # 开启 JavaScript 爬取 + 自动解析 .js 文件里的所有端点（最重要）
            '-xhr '                  # 额外从 JS 中提取 XHR/Fetch 请求的 API 路径（再多挖 10-20% 隐藏接口）
            '-kf all '               # 在每个目录下自动 fuzz 所有已知敏感文件（.env、.git、backup、config、ds_store 等 5000+ 条）
            '-fs rdn '               # 智能过滤相对重复+噪声路径（分页、?id=1/2/3 这类垃圾全干掉，输出极干净）
            '-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" '  # 固定一个正常 UA（Katana 默认会随机，但固定更低调）
            '-silent '               # 安静模式（终端不输出进度条，只出 URL）
        ),
        'optional': {
            'depth': '-d {depth}',                      # 爬取最大深度（平衡深度与时间，默认 3，推荐 5）
            'threads': '-c {threads}',                  # 全局并发数（极低并发最像真人，推荐 10）
            'rate-limit': '-rl {rate-limit}',           # 全局硬限速：每秒最多 N 个请求（WAF 几乎不报警，推荐 30）
            'random-delay': '-rd {random-delay}',       # 每次请求之间随机延迟 N 秒（再加一层人性化，推荐 1）
            'retry': '-retry {retry}',                  # 失败请求自动重试次数（网络抖动不丢包，推荐 2）
            'request-timeout': '-timeout {request-timeout}'  # 单请求超时秒数（防卡死，推荐 12）
        },
        'input_type': 'sites_file'
    },
    
    'uro': {
        'base': 'uro -i {input_file} -o {output_file}',
        'optional': {
            'whitelist': '-w {whitelist}',      # 只保留指定扩展名的 URL（空格分隔）
            'blacklist': '-b {blacklist}',      # 排除指定扩展名的 URL（空格分隔）
            'filters': '-f {filters}'           # 额外的过滤规则（空格分隔）
        }
    },
    
    'httpx': {
        'base': (
            '$HOME/go/bin/httpx -l {url_file} '
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
