import { SecurityToolBlockEnum } from '../../canvas/libs/types'
import type { ToolParameter } from '../../canvas/libs/types'

// 预定义安全工具（参考 Dify 的 NODES_EXTRA_DATA）
export const PREDEFINED_SECURITY_TOOLS = {
  nmap: {
    toolName: 'nmap',
    toolPath: '/usr/bin/nmap',
    commandTemplate: 'nmap {scanTypeFlag} {timingFlag} -p {portRange} {outputFlag} {target}',
    timeout: 300,
    outputFormat: 'xml' as const,
    icon: 'network-scan',
    description: '网络端口扫描工具',
    category: 'network',
    paramSchemas: [
      {
        name: 'target',
        displayName: '扫描目标',
        type: 'string',
        required: true,
        description: 'IP地址、域名或IP段（如：192.168.1.1 或 example.com 或 192.168.1.0/24）',
        commandFlag: '',
        validation: {
          pattern: '^[a-zA-Z0-9\\.\\-\\/\\s]+$'
        }
      },
      {
        name: 'portRange',
        displayName: '端口范围',
        type: 'string',
        required: false,
        defaultValue: '1-1000',
        commandFlag: '-p',
        description: '要扫描的端口范围（如：80,443 或 1-1000）'
      },
      {
        name: 'scanType',
        displayName: '扫描类型',
        type: 'select',
        required: false,
        defaultValue: 'syn',
        commandFlag: '',
        validation: {
          options: ['syn', 'tcp', 'connect', 'udp', 'fin', 'null', 'xmas']
        },
        description: 'SYN扫描速度快，TCP Connect扫描更可靠'
      },
      {
        name: 'timing',
        displayName: '扫描速度',
        type: 'select',
        required: false,
        defaultValue: 'T3',
        commandFlag: '',
        validation: {
          options: ['T0', 'T1', 'T2', 'T3', 'T4', 'T5']
        },
        description: 'T0最慢最隐蔽，T5最快但容易被发现'
      },
      {
        name: 'serviceDetection',
        displayName: '服务检测',
        type: 'boolean',
        required: false,
        defaultValue: true,
        commandFlag: '-sV',
        description: '检测开放端口上运行的服务版本'
      }
    ] as ToolParameter[]
  },
  
  sqlmap: {
    toolName: 'sqlmap',
    toolPath: '/usr/bin/sqlmap',
    commandTemplate: 'sqlmap -u {url} {dataFlag} {cookieFlag} --level={level} --risk={risk} --batch',
    timeout: 600,
    outputFormat: 'json' as const,
    icon: 'database-scan',
    description: 'SQL注入漏洞检测工具',
    category: 'web',
    paramSchemas: [
      {
        name: 'url',
        displayName: '目标URL',
        type: 'string',
        required: true,
        description: '要测试的URL（如：http://example.com/page.php?id=1）',
        commandFlag: '-u',
        validation: {
          pattern: '^https?:\\/\\/.+'
        }
      },
      {
        name: 'data',
        displayName: 'POST数据',
        type: 'string',
        required: false,
        description: 'POST请求数据（如：username=admin&password=123）',
        commandFlag: '--data'
      },
      {
        name: 'cookie',
        displayName: 'Cookie',
        type: 'string',
        required: false,
        description: 'HTTP Cookie值（如：PHPSESSID=abc123）',
        commandFlag: '--cookie'
      },
      {
        name: 'level',
        displayName: '测试级别',
        type: 'select',
        required: false,
        defaultValue: '1',
        commandFlag: '--level',
        validation: {
          options: ['1', '2', '3', '4', '5']
        },
        description: '测试的详细程度，1-5级别递增'
      },
      {
        name: 'risk',
        displayName: '风险级别',
        type: 'select',
        required: false,
        defaultValue: '1',
        commandFlag: '--risk',
        validation: {
          options: ['1', '2', '3']
        },
        description: '测试的风险级别，1安全，3可能造成数据损坏'
      },
      {
        name: 'technique',
        displayName: '注入技术',
        type: 'select',
        required: false,
        defaultValue: 'BEUSTQ',
        commandFlag: '--technique',
        validation: {
          options: ['B', 'E', 'U', 'S', 'T', 'Q', 'BEUSTQ']
        },
        description: 'B=布尔盲注, E=错误注入, U=联合查询, S=堆叠查询, T=时间盲注, Q=内联查询'
      }
    ] as ToolParameter[]
  },
  
  nuclei: {
    toolName: 'nuclei',
    toolPath: '/usr/bin/nuclei',
    commandTemplate: 'nuclei -target {target} {templatesFlag} {severityFlag} -c {concurrency} -json',
    timeout: 900,
    outputFormat: 'json' as const,
    icon: 'vulnerability-scan',
    description: '快速漏洞扫描工具',
    category: 'vulnerability',
    paramSchemas: [
      {
        name: 'target',
        displayName: '扫描目标',
        type: 'string',
        required: true,
        description: '要扫描的URL或IP（如：https://example.com 或 192.168.1.1）',
        commandFlag: '-target'
      },
      {
        name: 'templates',
        displayName: '模板标签',
        type: 'string',
        required: false,
        description: '指定要使用的模板标签（用逗号分隔，如：cve,sqli,xss）',
        commandFlag: '-tags'
      },
      {
        name: 'severity',
        displayName: '严重性过滤',
        type: 'select',
        required: false,
        commandFlag: '-severity',
        validation: {
          options: ['info', 'low', 'medium', 'high', 'critical']
        },
        description: '只扫描指定严重级别的漏洞'
      },
      {
        name: 'concurrency',
        displayName: '并发数',
        type: 'number',
        required: false,
        defaultValue: 25,
        commandFlag: '-c',
        validation: {
          min: 1,
          max: 100
        },
        description: '并发扫描的模板数量，过高可能被目标封禁'
      },
      {
        name: 'rateLimit',
        displayName: '速率限制',
        type: 'number',
        required: false,
        defaultValue: 150,
        commandFlag: '-rate-limit',
        validation: {
          min: 1,
          max: 1000
        },
        description: '每秒最大请求数'
      },
      {
        name: 'timeout',
        displayName: '请求超时',
        type: 'number',
        required: false,
        defaultValue: 5,
        commandFlag: '-timeout',
        validation: {
          min: 1,
          max: 60
        },
        description: '每个请求的超时时间（秒）'
      }
    ] as ToolParameter[]
  },

  masscan: {
    toolName: 'masscan',
    toolPath: '/usr/bin/masscan',
    commandTemplate: 'masscan {target} -p {ports} --rate={rate} --wait={wait}',
    timeout: 300,
    outputFormat: 'json' as const,
    icon: 'network-scan',
    description: '高速网络端口扫描工具',
    category: 'network',
    paramSchemas: [
      {
        name: 'target',
        displayName: '扫描目标',
        type: 'string',
        required: true,
        description: 'IP地址或IP段（如：192.168.1.0/24）',
        commandFlag: ''
      },
      {
        name: 'ports',
        displayName: '端口',
        type: 'string',
        required: true,
        defaultValue: '80,443,22,21,25,53,110,143,993,995',
        commandFlag: '-p',
        description: '要扫描的端口（如：80,443 或 1-1000）'
      },
      {
        name: 'rate',
        displayName: '扫描速率',
        type: 'number',
        required: false,
        defaultValue: 1000,
        commandFlag: '--rate',
        validation: {
          min: 1,
          max: 100000
        },
        description: '每秒发包数量'
      },
      {
        name: 'wait',
        displayName: '等待时间',
        type: 'number',
        required: false,
        defaultValue: 3,
        commandFlag: '--wait',
        validation: {
          min: 0,
          max: 60
        },
        description: '等待响应的时间（秒）'
      }
    ] as ToolParameter[]
  },

  gobuster: {
    toolName: 'gobuster',
    toolPath: '/usr/bin/gobuster',
    commandTemplate: 'gobuster dir -u {url} -w {wordlist} -t {threads} {extensionsFlag}',
    timeout: 600,
    outputFormat: 'txt' as const,
    icon: 'web-scan',
    description: 'Web目录和文件暴力破解工具',
    category: 'web',
    paramSchemas: [
      {
        name: 'url',
        displayName: '目标URL',
        type: 'string',
        required: true,
        description: '要扫描的网站URL（如：https://example.com）',
        commandFlag: '-u',
        validation: {
          pattern: '^https?:\\/\\/.+'
        }
      },
      {
        name: 'wordlist',
        displayName: '字典文件',
        type: 'select',
        required: true,
        defaultValue: '/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt',
        commandFlag: '-w',
        validation: {
          options: [
            '/usr/share/wordlists/dirbuster/directory-list-2.3-small.txt',
            '/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt',
            '/usr/share/wordlists/dirbuster/directory-list-2.3-big.txt',
            '/usr/share/wordlists/dirb/common.txt',
            '/usr/share/wordlists/dirb/big.txt'
          ]
        },
        description: '用于暴力破解的字典文件'
      },
      {
        name: 'threads',
        displayName: '线程数',
        type: 'number',
        required: false,
        defaultValue: 10,
        commandFlag: '-t',
        validation: {
          min: 1,
          max: 100
        },
        description: '并发线程数量'
      },
      {
        name: 'extensions',
        displayName: '文件扩展名',
        type: 'string',
        required: false,
        defaultValue: 'php,html,txt,js',
        commandFlag: '-x',
        description: '要查找的文件扩展名（逗号分隔）'
      }
    ] as ToolParameter[]
  }
} as const

// 节点默认配置（参考 Dify constants.ts）
export const SECURITY_NODES_EXTRA_DATA = {
  [SecurityToolBlockEnum.Start]: {
    author: 'Xingra',
    about: '工作流开始节点，定义扫描任务的起点',
    getAvailablePrevNodes: () => [],
    getAvailableNextNodes: () => [
      SecurityToolBlockEnum.TargetInput, 
      SecurityToolBlockEnum.CustomTool
    ],
    defaultTitle: '开始节点',
    defaultDesc: '工作流的起始点',
  },
  [SecurityToolBlockEnum.CustomTool]: {
    author: 'Xingra',
    about: '自定义安全工具节点，支持配置各种扫描工具',
    getAvailablePrevNodes: () => [
      SecurityToolBlockEnum.Start, 
      SecurityToolBlockEnum.TargetInput,
      SecurityToolBlockEnum.CustomTool
    ],
    getAvailableNextNodes: () => [
      SecurityToolBlockEnum.CustomTool,
      SecurityToolBlockEnum.DataFilter, 
      SecurityToolBlockEnum.DataMerge,
      SecurityToolBlockEnum.ReportOutput,
      SecurityToolBlockEnum.End
    ],
    defaultTitle: '安全工具',
    defaultDesc: '配置和执行安全扫描工具',
  },
  [SecurityToolBlockEnum.TargetInput]: {
    author: 'Xingra',
    about: '目标输入节点，定义扫描目标',
    getAvailablePrevNodes: () => [SecurityToolBlockEnum.Start],
    getAvailableNextNodes: () => [SecurityToolBlockEnum.CustomTool],
    defaultTitle: '目标输入',
    defaultDesc: '定义扫描的目标地址',
  },
  [SecurityToolBlockEnum.DataFilter]: {
    author: 'Xingra',
    about: '数据过滤节点，筛选扫描结果',
    getAvailablePrevNodes: () => [SecurityToolBlockEnum.CustomTool],
    getAvailableNextNodes: () => [
      SecurityToolBlockEnum.DataMerge,
      SecurityToolBlockEnum.ReportOutput,
      SecurityToolBlockEnum.End
    ],
    defaultTitle: '数据过滤',
    defaultDesc: '过滤和筛选扫描结果',
  },
  [SecurityToolBlockEnum.DataMerge]: {
    author: 'Xingra',
    about: '数据合并节点，合并多个扫描结果',
    getAvailablePrevNodes: () => [
      SecurityToolBlockEnum.CustomTool,
      SecurityToolBlockEnum.DataFilter
    ],
    getAvailableNextNodes: () => [
      SecurityToolBlockEnum.ReportOutput,
      SecurityToolBlockEnum.End
    ],
    defaultTitle: '数据合并',
    defaultDesc: '合并多个扫描结果',
  },
  [SecurityToolBlockEnum.ReportOutput]: {
    author: 'Xingra',
    about: '报告输出节点，生成扫描报告',
    getAvailablePrevNodes: () => [
      SecurityToolBlockEnum.CustomTool,
      SecurityToolBlockEnum.DataFilter,
      SecurityToolBlockEnum.DataMerge
    ],
    getAvailableNextNodes: () => [SecurityToolBlockEnum.End],
    defaultTitle: '报告输出',
    defaultDesc: '生成和导出扫描报告',
  },
  [SecurityToolBlockEnum.End]: {
    author: 'Xingra',
    about: '工作流结束节点，完成扫描任务',
    getAvailablePrevNodes: () => [
      SecurityToolBlockEnum.CustomTool,
      SecurityToolBlockEnum.DataFilter,
      SecurityToolBlockEnum.DataMerge,
      SecurityToolBlockEnum.ReportOutput
    ],
    getAvailableNextNodes: () => [],
    defaultTitle: '结束节点',
    defaultDesc: '工作流的结束点',
  },
}

// 工具分类
export const TOOL_CATEGORIES = {
  network: {
    name: '网络扫描',
    description: '端口扫描、网络发现等工具',
    icon: 'network',
    color: 'blue'
  },
  web: {
    name: 'Web扫描',
    description: 'Web应用安全扫描工具',
    icon: 'globe',
    color: 'green'
  },
  vulnerability: {
    name: '漏洞扫描',
    description: '漏洞检测和利用工具',
    icon: 'shield-alert',
    color: 'red'
  },
  reconnaissance: {
    name: '信息收集',
    description: '目标信息收集工具',
    icon: 'search',
    color: 'purple'
  }
} as const

// 节点颜色配置
export const NODE_COLORS = {
  [SecurityToolBlockEnum.Start]: {
    primary: '#22c55e',
    secondary: '#16a34a',
    background: '#f0fdf4',
    border: '#bbf7d0'
  },
  [SecurityToolBlockEnum.CustomTool]: {
    primary: '#3b82f6',
    secondary: '#2563eb',
    background: '#eff6ff',
    border: '#bfdbfe'
  },
  [SecurityToolBlockEnum.TargetInput]: {
    primary: '#f59e0b',
    secondary: '#d97706',
    background: '#fffbeb',
    border: '#fde68a'
  },
  [SecurityToolBlockEnum.DataFilter]: {
    primary: '#8b5cf6',
    secondary: '#7c3aed',
    background: '#faf5ff',
    border: '#ddd6fe'
  },
  [SecurityToolBlockEnum.DataMerge]: {
    primary: '#06b6d4',
    secondary: '#0891b2',
    background: '#f0fdfa',
    border: '#a7f3d0'
  },
  [SecurityToolBlockEnum.ReportOutput]: {
    primary: '#ec4899',
    secondary: '#db2777',
    background: '#fdf2f8',
    border: '#fbcfe8'
  },
  [SecurityToolBlockEnum.End]: {
    primary: '#ef4444',
    secondary: '#dc2626',
    background: '#fef2f2',
    border: '#fecaca'
  }
} as const

// React Flow 相关常量
export const WORKFLOW_CONSTANTS = {
  CUSTOM_NODE: 'custom-security-node',
  CUSTOM_EDGE: 'custom-security-edge',
  CUSTOM_CONNECTION_LINE: 'custom-security-connection-line',
  
  // 节点尺寸
  NODE_MIN_WIDTH: 200,
  NODE_MIN_HEIGHT: 80,
  NODE_MAX_WIDTH: 400,
  NODE_MAX_HEIGHT: 300,
  
  // 画布配置
  CANVAS_PADDING: 20,
  GRID_SIZE: 20,
  SNAP_GRID: true,
  
  // 动画配置
  ANIMATION_DURATION: 300,
  TRANSITION_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const

// 默认工作流配置
export const DEFAULT_WORKFLOW_CONFIG = {
  parallelExecution: false,
  maxConcurrentNodes: 3,
  timeoutPerNode: 300,
  retryFailedNodes: true,
  maxRetries: 2,
  saveIntermediateResults: true,
} as const

// 支持的输出格式
export const SUPPORTED_OUTPUT_FORMATS = {
  json: {
    name: 'JSON',
    description: '结构化数据格式',
    extension: '.json',
    mimeType: 'application/json'
  },
  xml: {
    name: 'XML',
    description: 'XML标记语言格式',
    extension: '.xml',
    mimeType: 'application/xml'
  },
  csv: {
    name: 'CSV',
    description: '逗号分隔值格式',
    extension: '.csv',
    mimeType: 'text/csv'
  },
  txt: {
    name: 'TXT',
    description: '纯文本格式',
    extension: '.txt',
    mimeType: 'text/plain'
  },
  html: {
    name: 'HTML',
    description: '网页格式报告',
    extension: '.html',
    mimeType: 'text/html'
  },
  pdf: {
    name: 'PDF',
    description: 'PDF文档格式',
    extension: '.pdf',
    mimeType: 'application/pdf'
  }
} as const

// 严重性级别配置
export const SEVERITY_LEVELS = {
  critical: {
    name: '严重',
    color: '#dc2626',
    priority: 5,
    description: '需要立即处理的高危漏洞'
  },
  high: {
    name: '高危',
    color: '#ea580c',
    priority: 4,
    description: '需要优先处理的漏洞'
  },
  medium: {
    name: '中危',
    color: '#ca8a04',
    priority: 3,
    description: '需要关注的安全问题'
  },
  low: {
    name: '低危',
    color: '#65a30d',
    priority: 2,
    description: '轻微的安全问题'
  },
  info: {
    name: '信息',
    color: '#0891b2',
    priority: 1,
    description: '信息性发现，无安全威胁'
  }
} as const 