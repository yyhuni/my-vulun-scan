"""扫描工具命令模板（Jinja2 格式）

定义所有扫描工具的命令模板。

架构：
- 使用 Jinja2 模板语法：{{ variable }}
- 条件语法：{% if condition %} ... {% endif %}
- 注释语法：{# 注释内容 #}（渲染时自动移除）
- 空白控制：{%- 去除左侧空白，-%} 去除右侧空白
- 基础命令：必需参数的命令模板（如 subfinder -d {{ domain }} -o {{ output_file }}）
- 可选参数：使用条件语句（如 {% if threads %} -t {{ threads }}{% endif %}）
- 系统参数：scan_tools_base 由系统自动注入

示例：
    'subfinder': {
        'command': '''
            subfinder -d {{ domain }} -o {{ output_file }} -silent
            {%- if threads %} -t {{ threads }}{% endif %}  {# 可选：线程数 #}
        '''
    }
"""

import os

# ==================== 路径配置 ====================
# 扫描工具基础路径（支持环境变量配置）
SCAN_TOOLS_BASE_PATH = os.getenv('SCAN_TOOLS_PATH', '/opt/github')

# ==================== 子域名发现 ====================

SUBDOMAIN_DISCOVERY_COMMANDS = {
    'subfinder': {
        'command': '''
            subfinder -d {{ domain }} -o {{ output_file }} -silent
            {%- if threads %} -t {{ threads }}{% endif %}
        '''
    },
    
    'amass_passive': {
        'command': 'amass enum -passive -d {{ domain }} -o {{ output_file }}'
    },
    
    'amass_active': {
        'command': '''
            amass enum -active -d {{ domain }} -o {{ output_file }} -brute
            {%- if wordlist %} -w {{ wordlist }}{% endif %}
        '''
    },
    
    'sublist3r': {
        'command': '''
            python3 {{ scan_tools_base }}/Sublist3r/sublist3r.py 
                -d {{ domain }} 
                -o {{ output_file }}
            {%- if threads %} -t {{ threads }}{% endif %}
        '''
    },
    
    'oneforall': {
        'command': '''
            python3 {{ scan_tools_base }}/OneForAll/oneforall.py --target {{ domain }} run && 
            cut -d',' -f6 {{ scan_tools_base }}/OneForAll/results/{{ domain }}.csv | tail -n +2 > {{ output_file }} && 
            rm -rf {{ scan_tools_base }}/OneForAll/results/{{ domain }}.csv
        '''
    },
}


# ==================== 端口扫描 ====================

PORT_SCAN_COMMANDS = {
    'naabu_active': {
        'command': '''
            naabu -exclude-cdn -warm-up-time 5 -retries 1 -verify -timeout 5000 
                -list {{ target_file }} 
                -json -silent
            {%- if threads %} -c {{ threads }}{% endif %}  {# 并发线程数 #}
            {%- if ports %} -p {{ ports }}{% endif %}      {# 端口范围（如 80,443,1-65535）#}
            {%- if rate %} -rate {{ rate }}{% endif %}     {# 每秒包数 #}
        '''
    },
    
    'naabu_passive': {
        'command': 'naabu -list {{ target_file }} -passive -json -silent'
    },
}


# ==================== 站点扫描 ====================

SITE_SCAN_COMMANDS = {
    'httpx': {
        'command': '''
            $HOME/go/bin/httpx 
                -l {{ target_file }} 
                -status-code -content-type -content-length 
                -location -title -server -body-preview 
                -tech-detect -cdn -vhost 
                -random-agent -no-color -json
            {%- if threads %} -threads {{ threads }}{% endif %}              {# 并发线程数 #}
            {%- if rate_limit %} -rate-limit {{ rate_limit }}{% endif %}     {# 速率限制 #}
            {%- if request_timeout %} -timeout {{ request_timeout }}{% endif %} {# 请求超时（秒）#}
            {%- if retries %} -retries {{ retries }}{% endif %}              {# 重试次数 #}
        '''
    },
}


# ==================== 目录扫描 ====================

DIRECTORY_SCAN_COMMANDS = {
    'ffuf': {
        'command': '''
            ffuf -u {{ url }}/FUZZ -se -ac -sf -json -w {{ wordlist }}
            {%- if delay %} -p {{ delay }}{% endif %}                           {# 请求间延迟（秒）#}
            {%- if threads %} -t {{ threads }}{% endif %}                       {# 并发线程数（默认40）#}
            {%- if request_timeout %} -timeout {{ request_timeout }}{% endif %} {# 请求超时（秒）#}
            {%- if match_codes %} -mc {{ match_codes }}{% endif %}              {# 匹配状态码 #}
            {%- if rate %} -rate {{ rate }}{% endif %}                          {# 每秒请求数 #}
        '''
    },
}


# ==================== URL 获取 ====================

URL_FETCH_COMMANDS = {
    'waymore': {
        'command': 'waymore -i {{ target }} -mode U -oU {{ output_file }}',
        'input_type': 'domain'
    },
    
    'katana': {
        'command': '''
            $HOME/go/bin/katana 
                -u {{ url }} 
                -o {{ output_file }} 
                -silent -jsonl
            {%- if depth %} -d {{ depth }}{% endif %}
            {%- if threads %} -c {{ threads }}{% endif %}
            {%- if rate_limit %} -rl {{ rate_limit }}{% endif %}
        ''',
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
