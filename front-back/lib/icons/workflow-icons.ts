/**
 * Workflow 图标映射系统
 * 
 * 统一管理所有workflow相关的图标，支持：
 * - 图标名称到组件的映射
 * - 图标分类和标签
 * - 图标搜索和过滤
 * - 类型安全的图标引用
 */

import {
  // 基础图标
  Terminal,
  Shield,
  Network,
  Bug,
  Eye,
  Database,
  FileText,
  Settings,
  Code,
  Workflow,
  Palette,
  Upload,
  Download,
  Search,
  Scan,
  Lock,
  Unlock,
  Key,
  Globe,
  Server,
  Cloud,
  
  // 工具类图标
  Wrench,
  Hammer,
  Screwdriver,
  Cog,
  
  // 安全类图标
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  AlertCircle,
  Zap,
  
  // 网络类图标
  Wifi,
  Router,
  Antenna,
  Radio,
  Satellite,
  
  // 数据类图标
  HardDrive,
  Folder,
  File,
  Archive,
  Package,
  
  // 分析类图标
  BarChart,
  PieChart,
  TrendingUp,
  Activity,
  Monitor,
  
  // 执行类图标
  Play,
  Pause,
  Square,
  RotateCw,
  FastForward,
  
  // 状态类图标
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  
  // 其他常用图标
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  Move,
  Target,
  Crosshair,
  Filter,
  Sort,

  // 新增图标 - 更多安全工具
  Fingerprint,
  UserCheck,
  UserX,
  Users,
  Crown,
  Award,

  // 新增图标 - 更多网络工具
  Link,
  Unlink,
  ExternalLink,
  Mail,
  MessageSquare,
  Phone,
  Smartphone,
  Laptop,
  Tablet,

  // 新增图标 - 更多数据工具
  Table,
  BarChart3,
  LineChart,
  PieChart,
  TrendingDown,
  Calculator,
  Binary,
  Hash,

  // 新增图标 - 更多开发工具
  GitBranch,
  GitCommit,
  GitMerge,
  Github,
  Command,
  Cpu,
  MemoryStick,
  Zap,

  // 新增图标 - 更多文件工具
  Image,
  Video,
  Music,
  FileCode,
  FileImage,
  FileVideo,
  FilePlus,
  FolderOpen,
  FolderPlus,

  // 新增图标 - 更多状态图标
  Info,
  AlertOctagon,
  CheckSquare,
  XSquare,
  MinusCircle,
  PlusCircle,
  HelpCircle,

  // 新增图标 - 更多工具图标
  Scissors,
  Paperclip,
  Pin,
  Bookmark,
  Tag,
  Tags,
  Flag,
  Star,
  Heart,

  // 新增图标 - 更多执行图标
  SkipForward,
  SkipBack,
  Rewind,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,

  // 新增图标 - 更多界面图标
  Home,
  Menu,
  MoreHorizontal,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,

  // 新增图标 - 更多功能图标
  Calendar,
  Clock3,
  Timer,
  Bell,
  BellOff,
  Sun,
  Moon,
  Lightbulb,
  Power,

  type LucideIcon
} from 'lucide-react'

// 图标类型定义
export interface WorkflowIcon {
  /** 图标组件 */
  icon: LucideIcon
  /** 显示标签 */
  label: string
  /** 图标分类 */
  category: IconCategory
  /** 搜索关键词 */
  keywords: string[]
  /** 图标描述 */
  description?: string
}

// 图标分类枚举
export enum IconCategory {
  SECURITY = 'security',
  NETWORK = 'network', 
  DATABASE = 'database',
  ANALYSIS = 'analysis',
  TOOLS = 'tools',
  EXECUTION = 'execution',
  STATUS = 'status',
  FILES = 'files',
  BASIC = 'basic'
}

// 图标映射表
export const WORKFLOW_ICONS: Record<string, WorkflowIcon> = {
  // 安全类图标
  'Terminal': {
    icon: Terminal,
    label: '终端',
    category: IconCategory.TOOLS,
    keywords: ['terminal', '终端', 'command', '命令行', 'cli'],
    description: '命令行终端工具'
  },
  'Shield': {
    icon: Shield,
    label: '盾牌',
    category: IconCategory.SECURITY,
    keywords: ['shield', '盾牌', 'security', '安全', 'protection', '防护'],
    description: '安全防护'
  },
  'ShieldCheck': {
    icon: ShieldCheck,
    label: '安全检查',
    category: IconCategory.SECURITY,
    keywords: ['shield', 'check', '安全', '检查', 'verified', '验证'],
    description: '安全验证通过'
  },
  'ShieldAlert': {
    icon: ShieldAlert,
    label: '安全警告',
    category: IconCategory.SECURITY,
    keywords: ['shield', 'alert', '安全', '警告', 'warning', '风险'],
    description: '安全风险警告'
  },
  'ShieldX': {
    icon: ShieldX,
    label: '安全失败',
    category: IconCategory.SECURITY,
    keywords: ['shield', 'error', '安全', '失败', 'failed', '错误'],
    description: '安全检查失败'
  },
  'Lock': {
    icon: Lock,
    label: '锁定',
    category: IconCategory.SECURITY,
    keywords: ['lock', '锁定', 'secure', '安全', 'encrypted', '加密'],
    description: '安全锁定'
  },
  'Unlock': {
    icon: Unlock,
    label: '解锁',
    category: IconCategory.SECURITY,
    keywords: ['unlock', '解锁', 'open', '开放', 'decrypted', '解密'],
    description: '解除锁定'
  },
  'Key': {
    icon: Key,
    label: '密钥',
    category: IconCategory.SECURITY,
    keywords: ['key', '密钥', 'password', '密码', 'auth', '认证'],
    description: '密钥认证'
  },
  'Bug': {
    icon: Bug,
    label: '漏洞',
    category: IconCategory.SECURITY,
    keywords: ['bug', '漏洞', 'vulnerability', '安全漏洞', 'exploit'],
    description: '安全漏洞检测'
  },
  
  // 网络类图标
  'Network': {
    icon: Network,
    label: '网络',
    category: IconCategory.NETWORK,
    keywords: ['network', '网络', 'connection', '连接', 'topology', '拓扑'],
    description: '网络连接'
  },
  'Globe': {
    icon: Globe,
    label: '全球网络',
    category: IconCategory.NETWORK,
    keywords: ['globe', '全球', 'internet', '互联网', 'web', '网络'],
    description: '互联网连接'
  },
  'Server': {
    icon: Server,
    label: '服务器',
    category: IconCategory.NETWORK,
    keywords: ['server', '服务器', 'host', '主机', 'infrastructure', '基础设施'],
    description: '服务器主机'
  },
  'Wifi': {
    icon: Wifi,
    label: '无线网络',
    category: IconCategory.NETWORK,
    keywords: ['wifi', '无线', 'wireless', '网络', 'signal', '信号'],
    description: '无线网络连接'
  },
  'Router': {
    icon: Router,
    label: '路由器',
    category: IconCategory.NETWORK,
    keywords: ['router', '路由器', 'gateway', '网关', 'network', '网络'],
    description: '网络路由器'
  },
  'Antenna': {
    icon: Antenna,
    label: '天线',
    category: IconCategory.NETWORK,
    keywords: ['antenna', '天线', 'signal', '信号', 'wireless', '无线'],
    description: '信号天线'
  },
  'Satellite': {
    icon: Satellite,
    label: '卫星',
    category: IconCategory.NETWORK,
    keywords: ['satellite', '卫星', 'communication', '通信', 'remote', '远程'],
    description: '卫星通信'
  },
  
  // 数据库类图标
  'Database': {
    icon: Database,
    label: '数据库',
    category: IconCategory.DATABASE,
    keywords: ['database', '数据库', 'data', '数据', 'storage', '存储'],
    description: '数据库存储'
  },
  'HardDrive': {
    icon: HardDrive,
    label: '硬盘',
    category: IconCategory.DATABASE,
    keywords: ['harddrive', '硬盘', 'storage', '存储', 'disk', '磁盘'],
    description: '硬盘存储'
  },
  
  // 文件类图标
  'FileText': {
    icon: FileText,
    label: '文件',
    category: IconCategory.FILES,
    keywords: ['file', '文件', 'document', '文档', 'text', '文本'],
    description: '文本文件'
  },
  'Folder': {
    icon: Folder,
    label: '文件夹',
    category: IconCategory.FILES,
    keywords: ['folder', '文件夹', 'directory', '目录', 'organize', '组织'],
    description: '文件夹目录'
  },
  'Archive': {
    icon: Archive,
    label: '归档',
    category: IconCategory.FILES,
    keywords: ['archive', '归档', 'compress', '压缩', 'backup', '备份'],
    description: '文件归档'
  },
  'Package': {
    icon: Package,
    label: '包',
    category: IconCategory.FILES,
    keywords: ['package', '包', 'bundle', '捆绑', 'module', '模块'],
    description: '软件包'
  },
  
  // 分析类图标
  'Eye': {
    icon: Eye,
    label: '侦查',
    category: IconCategory.ANALYSIS,
    keywords: ['eye', '眼睛', 'reconnaissance', '侦查', 'scan', '扫描'],
    description: '信息侦查'
  },
  'Search': {
    icon: Search,
    label: '搜索',
    category: IconCategory.ANALYSIS,
    keywords: ['search', '搜索', 'find', '查找', 'discover', '发现'],
    description: '搜索查找'
  },
  'Scan': {
    icon: Scan,
    label: '扫描',
    category: IconCategory.ANALYSIS,
    keywords: ['scan', '扫描', 'analyze', '分析', 'detect', '检测'],
    description: '扫描分析'
  },
  'BarChart': {
    icon: BarChart,
    label: '柱状图',
    category: IconCategory.ANALYSIS,
    keywords: ['chart', '图表', 'statistics', '统计', 'data', '数据'],
    description: '数据统计图表'
  },
  'Activity': {
    icon: Activity,
    label: '活动监控',
    category: IconCategory.ANALYSIS,
    keywords: ['activity', '活动', 'monitor', '监控', 'metrics', '指标'],
    description: '活动监控'
  },
  'Monitor': {
    icon: Monitor,
    label: '监控',
    category: IconCategory.ANALYSIS,
    keywords: ['monitor', '监控', 'watch', '观察', 'surveillance', '监视'],
    description: '系统监控'
  },
  
  // 工具类图标
  'Settings': {
    icon: Settings,
    label: '设置',
    category: IconCategory.TOOLS,
    keywords: ['settings', '设置', 'config', '配置', 'options', '选项'],
    description: '系统设置'
  },
  'Code': {
    icon: Code,
    label: '代码',
    category: IconCategory.TOOLS,
    keywords: ['code', '代码', 'programming', '编程', 'script', '脚本'],
    description: '代码编程'
  },
  'Wrench': {
    icon: Wrench,
    label: '扳手',
    category: IconCategory.TOOLS,
    keywords: ['wrench', '扳手', 'tool', '工具', 'fix', '修复'],
    description: '修复工具'
  },
  'Hammer': {
    icon: Hammer,
    label: '锤子',
    category: IconCategory.TOOLS,
    keywords: ['hammer', '锤子', 'build', '构建', 'tool', '工具'],
    description: '构建工具'
  },
  'Cog': {
    icon: Cog,
    label: '齿轮',
    category: IconCategory.TOOLS,
    keywords: ['cog', '齿轮', 'gear', '工具', 'utility', '实用程序'],
    description: '通用工具'
  },
  
  // 工作流类图标
  'Workflow': {
    icon: Workflow,
    label: '工作流',
    category: IconCategory.EXECUTION,
    keywords: ['workflow', '工作流', 'process', '流程', 'automation', '自动化'],
    description: '工作流程'
  },
  'Play': {
    icon: Play,
    label: '播放',
    category: IconCategory.EXECUTION,
    keywords: ['play', '播放', 'start', '开始', 'execute', '执行'],
    description: '开始执行'
  },
  'Pause': {
    icon: Pause,
    label: '暂停',
    category: IconCategory.EXECUTION,
    keywords: ['pause', '暂停', 'stop', '停止', 'hold', '保持'],
    description: '暂停执行'
  },
  'Square': {
    icon: Square,
    label: '停止',
    category: IconCategory.EXECUTION,
    keywords: ['square', '方形', 'stop', '停止', 'end', '结束'],
    description: '停止执行'
  },
  'RotateCw': {
    icon: RotateCw,
    label: '重试',
    category: IconCategory.EXECUTION,
    keywords: ['rotate', '旋转', 'retry', '重试', 'refresh', '刷新'],
    description: '重试执行'
  },
  
  // 状态类图标
  'CheckCircle': {
    icon: CheckCircle,
    label: '成功',
    category: IconCategory.STATUS,
    keywords: ['check', '检查', 'success', '成功', 'complete', '完成'],
    description: '执行成功'
  },
  'XCircle': {
    icon: XCircle,
    label: '失败',
    category: IconCategory.STATUS,
    keywords: ['x', '错误', 'error', '失败', 'failed', '失败'],
    description: '执行失败'
  },
  'AlertTriangle': {
    icon: AlertTriangle,
    label: '警告',
    category: IconCategory.STATUS,
    keywords: ['alert', '警告', 'warning', '警告', 'caution', '注意'],
    description: '警告状态'
  },
  'Clock': {
    icon: Clock,
    label: '等待',
    category: IconCategory.STATUS,
    keywords: ['clock', '时钟', 'waiting', '等待', 'pending', '待处理'],
    description: '等待状态'
  },
  'Loader': {
    icon: Loader,
    label: '加载中',
    category: IconCategory.STATUS,
    keywords: ['loader', '加载', 'loading', '加载中', 'processing', '处理中'],
    description: '加载状态'
  },
  
  // 其他常用图标
  'Upload': {
    icon: Upload,
    label: '上传',
    category: IconCategory.BASIC,
    keywords: ['upload', '上传', 'import', '导入', 'send', '发送'],
    description: '上传文件'
  },
  'Download': {
    icon: Download,
    label: '下载',
    category: IconCategory.BASIC,
    keywords: ['download', '下载', 'export', '导出', 'save', '保存'],
    description: '下载文件'
  },
  'Palette': {
    icon: Palette,
    label: '设计',
    category: IconCategory.BASIC,
    keywords: ['palette', '调色板', 'design', '设计', 'color', '颜色'],
    description: '设计工具'
  },
  'Target': {
    icon: Target,
    label: '目标',
    category: IconCategory.BASIC,
    keywords: ['target', '目标', 'aim', '瞄准', 'focus', '焦点'],
    description: '目标定位'
  },
  'Crosshair': {
    icon: Crosshair,
    label: '十字准星',
    category: IconCategory.BASIC,
    keywords: ['crosshair', '十字准星', 'precision', '精确', 'target', '目标'],
    description: '精确定位'
  },

  // 新增安全工具图标
  'Fingerprint': {
    icon: Fingerprint,
    label: '指纹识别',
    category: IconCategory.SECURITY,
    keywords: ['fingerprint', '指纹', 'biometric', '生物识别', 'auth', '认证'],
    description: '生物识别认证'
  },
  'UserCheck': {
    icon: UserCheck,
    label: '用户验证',
    category: IconCategory.SECURITY,
    keywords: ['user', '用户', 'check', '验证', 'verified', '已验证'],
    description: '用户身份验证'
  },
  'UserX': {
    icon: UserX,
    label: '用户拒绝',
    category: IconCategory.SECURITY,
    keywords: ['user', '用户', 'reject', '拒绝', 'denied', '拒绝访问'],
    description: '用户访问被拒绝'
  },
  'Users': {
    icon: Users,
    label: '用户组',
    category: IconCategory.SECURITY,
    keywords: ['users', '用户组', 'group', '组', 'team', '团队'],
    description: '用户组管理'
  },
  'Crown': {
    icon: Crown,
    label: '管理员',
    category: IconCategory.SECURITY,
    keywords: ['crown', '皇冠', 'admin', '管理员', 'privilege', '特权'],
    description: '管理员权限'
  },
  'Award': {
    icon: Award,
    label: '认证',
    category: IconCategory.SECURITY,
    keywords: ['award', '奖章', 'certificate', '认证', 'achievement', '成就'],
    description: '安全认证'
  },

  // 新增网络工具图标
  'Link': {
    icon: Link,
    label: '链接',
    category: IconCategory.NETWORK,
    keywords: ['link', '链接', 'url', '网址', 'connection', '连接'],
    description: '网络链接'
  },
  'Unlink': {
    icon: Unlink,
    label: '断开链接',
    category: IconCategory.NETWORK,
    keywords: ['unlink', '断开', 'disconnect', '断开连接', 'break', '中断'],
    description: '断开网络连接'
  },
  'ExternalLink': {
    icon: ExternalLink,
    label: '外部链接',
    category: IconCategory.NETWORK,
    keywords: ['external', '外部', 'link', '链接', 'open', '打开'],
    description: '外部网络链接'
  },
  'Mail': {
    icon: Mail,
    label: '邮件',
    category: IconCategory.NETWORK,
    keywords: ['mail', '邮件', 'email', '电子邮件', 'message', '消息'],
    description: '电子邮件'
  },
  'MessageSquare': {
    icon: MessageSquare,
    label: '消息',
    category: IconCategory.NETWORK,
    keywords: ['message', '消息', 'chat', '聊天', 'communication', '通信'],
    description: '即时消息'
  },
  'Phone': {
    icon: Phone,
    label: '电话',
    category: IconCategory.NETWORK,
    keywords: ['phone', '电话', 'call', '通话', 'contact', '联系'],
    description: '电话通信'
  },
  'Smartphone': {
    icon: Smartphone,
    label: '智能手机',
    category: IconCategory.NETWORK,
    keywords: ['smartphone', '智能手机', 'mobile', '移动设备', 'device', '设备'],
    description: '移动设备'
  },
  'Laptop': {
    icon: Laptop,
    label: '笔记本电脑',
    category: IconCategory.NETWORK,
    keywords: ['laptop', '笔记本', 'computer', '电脑', 'device', '设备'],
    description: '笔记本电脑'
  },
  'Tablet': {
    icon: Tablet,
    label: '平板电脑',
    category: IconCategory.NETWORK,
    keywords: ['tablet', '平板', 'ipad', '平板电脑', 'device', '设备'],
    description: '平板设备'
  },

  // 新增数据分析图标
  'Table': {
    icon: Table,
    label: '数据表',
    category: IconCategory.ANALYSIS,
    keywords: ['table', '表格', 'data', '数据', 'spreadsheet', '电子表格'],
    description: '数据表格'
  },
  'BarChart3': {
    icon: BarChart3,
    label: '柱状图',
    category: IconCategory.ANALYSIS,
    keywords: ['chart', '图表', 'bar', '柱状', 'statistics', '统计'],
    description: '柱状统计图'
  },
  'LineChart': {
    icon: LineChart,
    label: '折线图',
    category: IconCategory.ANALYSIS,
    keywords: ['line', '折线', 'chart', '图表', 'trend', '趋势'],
    description: '趋势折线图'
  },
  'TrendingDown': {
    icon: TrendingDown,
    label: '下降趋势',
    category: IconCategory.ANALYSIS,
    keywords: ['trending', '趋势', 'down', '下降', 'decrease', '减少'],
    description: '数据下降趋势'
  },
  'Calculator': {
    icon: Calculator,
    label: '计算器',
    category: IconCategory.ANALYSIS,
    keywords: ['calculator', '计算器', 'math', '数学', 'compute', '计算'],
    description: '数据计算'
  },
  'Binary': {
    icon: Binary,
    label: '二进制',
    category: IconCategory.ANALYSIS,
    keywords: ['binary', '二进制', 'code', '代码', 'data', '数据'],
    description: '二进制数据'
  },
  'Hash': {
    icon: Hash,
    label: '哈希',
    category: IconCategory.ANALYSIS,
    keywords: ['hash', '哈希', 'tag', '标签', 'number', '数字'],
    description: '哈希标识'
  },

  // 新增开发工具图标
  'GitBranch': {
    icon: GitBranch,
    label: 'Git分支',
    category: IconCategory.TOOLS,
    keywords: ['git', 'branch', '分支', 'version', '版本', 'code', '代码'],
    description: 'Git版本分支'
  },
  'GitCommit': {
    icon: GitCommit,
    label: 'Git提交',
    category: IconCategory.TOOLS,
    keywords: ['git', 'commit', '提交', 'version', '版本', 'save', '保存'],
    description: 'Git代码提交'
  },
  'GitMerge': {
    icon: GitMerge,
    label: 'Git合并',
    category: IconCategory.TOOLS,
    keywords: ['git', 'merge', '合并', 'combine', '组合', 'integrate', '集成'],
    description: 'Git分支合并'
  },
  'Github': {
    icon: Github,
    label: 'GitHub',
    category: IconCategory.TOOLS,
    keywords: ['github', 'git', '代码', 'repository', '仓库', 'source', '源码'],
    description: 'GitHub代码仓库'
  },
  'Command': {
    icon: Command,
    label: '命令',
    category: IconCategory.TOOLS,
    keywords: ['command', '命令', 'cmd', '指令', 'execute', '执行'],
    description: '命令执行'
  },
  'Cpu': {
    icon: Cpu,
    label: '处理器',
    category: IconCategory.TOOLS,
    keywords: ['cpu', '处理器', 'processor', '芯片', 'hardware', '硬件'],
    description: 'CPU处理器'
  },
  'MemoryStick': {
    icon: MemoryStick,
    label: '内存',
    category: IconCategory.TOOLS,
    keywords: ['memory', '内存', 'ram', '存储', 'storage', '硬件'],
    description: '内存存储'
  },

  // 新增文件工具图标
  'Image': {
    icon: Image,
    label: '图片',
    category: IconCategory.FILES,
    keywords: ['image', '图片', 'photo', '照片', 'picture', '图像'],
    description: '图片文件'
  },
  'Video': {
    icon: Video,
    label: '视频',
    category: IconCategory.FILES,
    keywords: ['video', '视频', 'movie', '电影', 'media', '媒体'],
    description: '视频文件'
  },
  'Music': {
    icon: Music,
    label: '音乐',
    category: IconCategory.FILES,
    keywords: ['music', '音乐', 'audio', '音频', 'sound', '声音'],
    description: '音频文件'
  },
  'FileCode': {
    icon: FileCode,
    label: '代码文件',
    category: IconCategory.FILES,
    keywords: ['file', '文件', 'code', '代码', 'programming', '编程'],
    description: '源代码文件'
  },
  'FileImage': {
    icon: FileImage,
    label: '图片文件',
    category: IconCategory.FILES,
    keywords: ['file', '文件', 'image', '图片', 'photo', '照片'],
    description: '图片文件'
  },
  'FileVideo': {
    icon: FileVideo,
    label: '视频文件',
    category: IconCategory.FILES,
    keywords: ['file', '文件', 'video', '视频', 'movie', '电影'],
    description: '视频文件'
  },
  'FilePlus': {
    icon: FilePlus,
    label: '新建文件',
    category: IconCategory.FILES,
    keywords: ['file', '文件', 'plus', '新建', 'create', '创建'],
    description: '创建新文件'
  },
  'FolderOpen': {
    icon: FolderOpen,
    label: '打开文件夹',
    category: IconCategory.FILES,
    keywords: ['folder', '文件夹', 'open', '打开', 'directory', '目录'],
    description: '打开的文件夹'
  },
  'FolderPlus': {
    icon: FolderPlus,
    label: '新建文件夹',
    category: IconCategory.FILES,
    keywords: ['folder', '文件夹', 'plus', '新建', 'create', '创建'],
    description: '创建新文件夹'
  },

  // 新增状态图标
  'Info': {
    icon: Info,
    label: '信息',
    category: IconCategory.STATUS,
    keywords: ['info', '信息', 'information', '详情', 'details', '说明'],
    description: '信息提示'
  },
  'AlertOctagon': {
    icon: AlertOctagon,
    label: '严重警告',
    category: IconCategory.STATUS,
    keywords: ['alert', '警告', 'danger', '危险', 'critical', '严重'],
    description: '严重警告状态'
  },
  'CheckSquare': {
    icon: CheckSquare,
    label: '已选中',
    category: IconCategory.STATUS,
    keywords: ['check', '选中', 'selected', '已选', 'done', '完成'],
    description: '选中状态'
  },
  'XSquare': {
    icon: XSquare,
    label: '未选中',
    category: IconCategory.STATUS,
    keywords: ['x', '未选', 'unselected', '取消', 'cancel', '关闭'],
    description: '未选中状态'
  },
  'MinusCircle': {
    icon: MinusCircle,
    label: '减少',
    category: IconCategory.STATUS,
    keywords: ['minus', '减少', 'remove', '移除', 'decrease', '减小'],
    description: '减少操作'
  },
  'PlusCircle': {
    icon: PlusCircle,
    label: '增加',
    category: IconCategory.STATUS,
    keywords: ['plus', '增加', 'add', '添加', 'increase', '增大'],
    description: '增加操作'
  },
  'HelpCircle': {
    icon: HelpCircle,
    label: '帮助',
    category: IconCategory.STATUS,
    keywords: ['help', '帮助', 'question', '问题', 'support', '支持'],
    description: '帮助信息'
  },

  // 新增工具图标
  'Scissors': {
    icon: Scissors,
    label: '剪切',
    category: IconCategory.TOOLS,
    keywords: ['scissors', '剪刀', 'cut', '剪切', 'clip', '裁剪'],
    description: '剪切工具'
  },
  'Paperclip': {
    icon: Paperclip,
    label: '附件',
    category: IconCategory.TOOLS,
    keywords: ['paperclip', '回形针', 'attachment', '附件', 'clip', '夹子'],
    description: '文件附件'
  },
  'Pin': {
    icon: Pin,
    label: '固定',
    category: IconCategory.TOOLS,
    keywords: ['pin', '固定', 'stick', '钉住', 'attach', '附加'],
    description: '固定标记'
  },
  'Bookmark': {
    icon: Bookmark,
    label: '书签',
    category: IconCategory.TOOLS,
    keywords: ['bookmark', '书签', 'favorite', '收藏', 'save', '保存'],
    description: '书签收藏'
  },
  'Tag': {
    icon: Tag,
    label: '标签',
    category: IconCategory.TOOLS,
    keywords: ['tag', '标签', 'label', '标记', 'mark', '标识'],
    description: '标签标记'
  },
  'Tags': {
    icon: Tags,
    label: '多标签',
    category: IconCategory.TOOLS,
    keywords: ['tags', '标签', 'labels', '标记', 'multiple', '多个'],
    description: '多个标签'
  },
  'Flag': {
    icon: Flag,
    label: '标记',
    category: IconCategory.TOOLS,
    keywords: ['flag', '旗帜', 'mark', '标记', 'important', '重要'],
    description: '重要标记'
  },
  'Star': {
    icon: Star,
    label: '星标',
    category: IconCategory.TOOLS,
    keywords: ['star', '星星', 'favorite', '收藏', 'important', '重要'],
    description: '星标收藏'
  },
  'Heart': {
    icon: Heart,
    label: '喜欢',
    category: IconCategory.TOOLS,
    keywords: ['heart', '心', 'like', '喜欢', 'love', '爱'],
    description: '喜欢标记'
  },

  // 新增执行控制图标
  'SkipForward': {
    icon: SkipForward,
    label: '快进',
    category: IconCategory.EXECUTION,
    keywords: ['skip', '跳过', 'forward', '前进', 'next', '下一个'],
    description: '跳到下一个'
  },
  'SkipBack': {
    icon: SkipBack,
    label: '快退',
    category: IconCategory.EXECUTION,
    keywords: ['skip', '跳过', 'back', '后退', 'previous', '上一个'],
    description: '跳到上一个'
  },
  'Rewind': {
    icon: Rewind,
    label: '倒带',
    category: IconCategory.EXECUTION,
    keywords: ['rewind', '倒带', 'backward', '向后', 'reverse', '反向'],
    description: '倒退播放'
  },
  'Repeat': {
    icon: Repeat,
    label: '重复',
    category: IconCategory.EXECUTION,
    keywords: ['repeat', '重复', 'loop', '循环', 'again', '再次'],
    description: '重复执行'
  },
  'Shuffle': {
    icon: Shuffle,
    label: '随机',
    category: IconCategory.EXECUTION,
    keywords: ['shuffle', '随机', 'random', '乱序', 'mix', '混合'],
    description: '随机执行'
  },
  'Volume2': {
    icon: Volume2,
    label: '音量',
    category: IconCategory.EXECUTION,
    keywords: ['volume', '音量', 'sound', '声音', 'audio', '音频'],
    description: '音量控制'
  },
  'VolumeX': {
    icon: VolumeX,
    label: '静音',
    category: IconCategory.EXECUTION,
    keywords: ['volume', '音量', 'mute', '静音', 'silent', '无声'],
    description: '静音模式'
  },

  // 新增界面导航图标
  'Home': {
    icon: Home,
    label: '首页',
    category: IconCategory.BASIC,
    keywords: ['home', '首页', 'main', '主页', 'start', '开始'],
    description: '返回首页'
  },
  'Menu': {
    icon: Menu,
    label: '菜单',
    category: IconCategory.BASIC,
    keywords: ['menu', '菜单', 'navigation', '导航', 'list', '列表'],
    description: '导航菜单'
  },
  'MoreHorizontal': {
    icon: MoreHorizontal,
    label: '更多选项',
    category: IconCategory.BASIC,
    keywords: ['more', '更多', 'options', '选项', 'menu', '菜单'],
    description: '更多操作选项'
  },
  'MoreVertical': {
    icon: MoreVertical,
    label: '垂直菜单',
    category: IconCategory.BASIC,
    keywords: ['more', '更多', 'vertical', '垂直', 'menu', '菜单'],
    description: '垂直菜单'
  },
  'ChevronUp': {
    icon: ChevronUp,
    label: '向上',
    category: IconCategory.BASIC,
    keywords: ['chevron', '箭头', 'up', '向上', 'expand', '展开'],
    description: '向上箭头'
  },
  'ChevronDown': {
    icon: ChevronDown,
    label: '向下',
    category: IconCategory.BASIC,
    keywords: ['chevron', '箭头', 'down', '向下', 'collapse', '收起'],
    description: '向下箭头'
  },
  'ChevronLeft': {
    icon: ChevronLeft,
    label: '向左',
    category: IconCategory.BASIC,
    keywords: ['chevron', '箭头', 'left', '向左', 'back', '返回'],
    description: '向左箭头'
  },
  'ChevronRight': {
    icon: ChevronRight,
    label: '向右',
    category: IconCategory.BASIC,
    keywords: ['chevron', '箭头', 'right', '向右', 'forward', '前进'],
    description: '向右箭头'
  },

  // 新增功能图标
  'Calendar': {
    icon: Calendar,
    label: '日历',
    category: IconCategory.BASIC,
    keywords: ['calendar', '日历', 'date', '日期', 'schedule', '日程'],
    description: '日历日期'
  },
  'Clock3': {
    icon: Clock3,
    label: '时钟',
    category: IconCategory.BASIC,
    keywords: ['clock', '时钟', 'time', '时间', 'hour', '小时'],
    description: '时间显示'
  },
  'Timer': {
    icon: Timer,
    label: '计时器',
    category: IconCategory.BASIC,
    keywords: ['timer', '计时器', 'countdown', '倒计时', 'time', '时间'],
    description: '计时功能'
  },
  'Bell': {
    icon: Bell,
    label: '通知',
    category: IconCategory.BASIC,
    keywords: ['bell', '铃铛', 'notification', '通知', 'alert', '提醒'],
    description: '通知提醒'
  },
  'BellOff': {
    icon: BellOff,
    label: '关闭通知',
    category: IconCategory.BASIC,
    keywords: ['bell', '铃铛', 'off', '关闭', 'silent', '静音'],
    description: '关闭通知'
  },
  'Sun': {
    icon: Sun,
    label: '亮色主题',
    category: IconCategory.BASIC,
    keywords: ['sun', '太阳', 'light', '亮色', 'day', '白天'],
    description: '亮色主题'
  },
  'Moon': {
    icon: Moon,
    label: '暗色主题',
    category: IconCategory.BASIC,
    keywords: ['moon', '月亮', 'dark', '暗色', 'night', '夜晚'],
    description: '暗色主题'
  },
  'Lightbulb': {
    icon: Lightbulb,
    label: '想法',
    category: IconCategory.BASIC,
    keywords: ['lightbulb', '灯泡', 'idea', '想法', 'inspiration', '灵感'],
    description: '创意想法'
  },
  'Power': {
    icon: Power,
    label: '电源',
    category: IconCategory.BASIC,
    keywords: ['power', '电源', 'on', '开启', 'off', '关闭'],
    description: '电源开关'
  }
}

// 图标名称类型（用于类型安全）
export type WorkflowIconName = keyof typeof WORKFLOW_ICONS

// 获取图标组件
export function getWorkflowIcon(name: WorkflowIconName): LucideIcon {
  return WORKFLOW_ICONS[name]?.icon || Terminal
}

// 获取图标信息
export function getWorkflowIconInfo(name: WorkflowIconName): WorkflowIcon | null {
  return WORKFLOW_ICONS[name] || null
}

// 按分类获取图标
export function getIconsByCategory(category: IconCategory): Record<string, WorkflowIcon> {
  return Object.fromEntries(
    Object.entries(WORKFLOW_ICONS).filter(([, icon]) => icon.category === category)
  )
}

// 搜索图标
export function searchIcons(query: string): Record<string, WorkflowIcon> {
  const lowerQuery = query.toLowerCase()
  return Object.fromEntries(
    Object.entries(WORKFLOW_ICONS).filter(([name, icon]) => 
      name.toLowerCase().includes(lowerQuery) ||
      icon.label.toLowerCase().includes(lowerQuery) ||
      icon.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
    )
  )
}

// 获取所有图标名称
export function getAllIconNames(): WorkflowIconName[] {
  return Object.keys(WORKFLOW_ICONS) as WorkflowIconName[]
}

// 获取分类标签
export const CATEGORY_LABELS: Record<IconCategory, string> = {
  [IconCategory.SECURITY]: '安全',
  [IconCategory.NETWORK]: '网络',
  [IconCategory.DATABASE]: '数据库',
  [IconCategory.ANALYSIS]: '分析',
  [IconCategory.TOOLS]: '工具',
  [IconCategory.EXECUTION]: '执行',
  [IconCategory.STATUS]: '状态',
  [IconCategory.FILES]: '文件',
  [IconCategory.BASIC]: '基础'
}

// 默认图标选项（向后兼容）
export const DEFAULT_ICON_OPTIONS = [
  { value: 'Terminal', label: '终端', icon: Terminal },
  { value: 'Shield', label: '盾牌', icon: Shield },
  { value: 'Network', label: '网络', icon: Network },
  { value: 'Bug', label: '漏洞', icon: Bug },
  { value: 'Eye', label: '侦查', icon: Eye },
  { value: 'Database', label: '数据库', icon: Database },
  { value: 'FileText', label: '文件', icon: FileText },
  { value: 'Settings', label: '设置', icon: Settings },
  { value: 'Code', label: '代码', icon: Code },
  { value: 'Workflow', label: '工作流', icon: Workflow },
  { value: 'Palette', label: '设计', icon: Palette },
  { value: 'Upload', label: '上传', icon: Upload },
]
