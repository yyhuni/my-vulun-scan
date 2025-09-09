// 工作流系统的外部类型声明
// 这个文件用于向其他模块暴露工作流相关的类型定义

// 导入核心类型
import type {
  SecurityToolBlockEnum,
  ExecutionType,
  NodeRunningStatus,
  WorkflowExecutionStatus,
  CommonSecurityNodeType,
  CustomToolNodeType,
  WorkflowStartNodeType,
  WorkflowEndNodeType,
  TargetInputNodeType,
  ReportOutputNodeType,
  DataFilterNodeType,
  DataMergeNodeType,
  AnySecurityNodeType,
  NodeProps,
  NodePanelProps,
  ToolParameter,
  ToolVarInputs,
  SecurityNode,
  SecurityEdge,
  WorkflowDataUpdater,
  ScanResult,
  Vulnerability,
  Port,
  WebInfo,
  Domain,
  DNSRecord,
  WorkflowExecutionConfig,
  WorkflowExecutionResult,
  FilterRule,
  Variable,
  ValueSelector,
  InputVar,
  InputVarType,
  WorkflowVariable,
} from '../../canvas/libs/types'

// 重新导出核心类型
export type {
  // 节点枚举和状态
  SecurityToolBlockEnum,
  ExecutionType,
  NodeRunningStatus,
  WorkflowExecutionStatus,

  // 节点类型
  CommonSecurityNodeType,
  CustomToolNodeType,
  WorkflowStartNodeType,
  WorkflowEndNodeType,
  TargetInputNodeType,
  ReportOutputNodeType,
  DataFilterNodeType,
  DataMergeNodeType,
  AnySecurityNodeType,

  // 节点属性
  NodeProps,
  NodePanelProps,

  // 工具相关
  ToolParameter,
  ToolVarInputs,

  // 工作流图形
  SecurityNode,
  SecurityEdge,
  WorkflowDataUpdater,

  // 扫描结果
  ScanResult,
  Vulnerability,
  Port,
  WebInfo,
  Domain,
  DNSRecord,

  // 工作流执行
  WorkflowExecutionConfig,
  WorkflowExecutionResult,

  // 过滤和变量
  FilterRule,
  Variable,
  ValueSelector,
  InputVar,
  InputVarType,
  WorkflowVariable,
}

// 重新导出常量
export {
  // 预定义工具
  PREDEFINED_SECURITY_TOOLS,
  
  // 节点配置
  SECURITY_NODES_EXTRA_DATA,
  
  // 分类和配置
  TOOL_CATEGORIES,
  NODE_COLORS,
  WORKFLOW_CONSTANTS,
  DEFAULT_WORKFLOW_CONFIG,
  SUPPORTED_OUTPUT_FORMATS,
  SEVERITY_LEVELS,
  
} from './constants'

// 工作流页面组件的属性类型
export interface WorkflowPageProps {
  // 工作流基本信息
  workflowId?: string
  isReadOnly?: boolean
  
  // 初始数据
  initialNodes?: SecurityNode[]
  initialEdges?: SecurityEdge[]
  
  // 回调函数
  onSave?: (nodes: SecurityNode[], edges: SecurityEdge[]) => Promise<void>
  onExecute?: (config: WorkflowExecutionConfig) => Promise<WorkflowExecutionResult>
  onExport?: (format: string) => Promise<Blob>
  
  // 事件处理
  onNodeSelect?: (nodeId: string | null) => void
  onWorkflowChange?: (nodes: SecurityNode[], edges: SecurityEdge[]) => void
}

// 工作流编辑器配置
export interface WorkflowEditorConfig {
  // 界面设置
  showMiniMap?: boolean
  showControls?: boolean
  showBackground?: boolean
  
  // 功能开关
  enableDragAndDrop?: boolean
  enableMultiSelection?: boolean
  enableKeyboardShortcuts?: boolean
  
  // 布局设置
  fitViewOnInit?: boolean
  snapToGrid?: boolean
  gridSize?: number
  
  // 性能设置
  nodesDraggable?: boolean
  nodesConnectable?: boolean
  elementsSelectable?: boolean
}

// 工具库配置
export interface ToolLibraryConfig {
  // 分类显示
  showCategories?: boolean
  defaultCategory?: string
  
  // 搜索功能
  enableSearch?: boolean
  searchPlaceholder?: string
  
  // 工具过滤
  enabledTools?: string[]
  hiddenTools?: string[]
  
  // 自定义工具
  customTools?: Record<string, any>
}

// 节点配置面板设置
export interface NodePanelConfig {
  // 面板行为
  autoFocus?: boolean
  validateOnChange?: boolean
  showPreview?: boolean
  
  // 字段配置
  showAdvancedOptions?: boolean
  collapsibleSections?: boolean
  
  // 帮助信息
  showFieldHelp?: boolean
  showExamples?: boolean
}

// 执行监控配置
export interface ExecutionMonitorConfig {
  // 更新频率
  refreshInterval?: number
  
  // 显示设置
  showProgress?: boolean
  showLogs?: boolean
  showErrors?: boolean
  
  // 通知设置
  notifyOnComplete?: boolean
  notifyOnError?: boolean
}

// 工作流模板定义
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]

  // 模板内容
  nodes: SecurityNode[]
  edges: SecurityEdge[]

  // 元数据
  author: string
  version: string
  createdAt: string
  updatedAt: string

  // 使用统计
  usageCount?: number
  rating?: number
}

// 工作流历史记录
export interface WorkflowHistory {
  id: string
  workflowId: string

  // 执行信息
  executionConfig: WorkflowExecutionConfig
  executionResult: WorkflowExecutionResult

  // 时间信息
  startedAt: string
  completedAt?: string
  duration?: number

  // 结果摘要
  totalNodes: number
  successfulNodes: number
  failedNodes: number

  // 发现统计
  totalVulnerabilities?: number
  vulnerabilitySummary?: Record<string, number>
}

// API 响应类型
export interface WorkflowApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  pagination?: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// 工作流列表项
export interface WorkflowListItem {
  id: string
  name: string
  description?: string

  // 状态信息
  status: 'draft' | 'published' | 'archived'
  lastExecution?: string

  // 统计信息
  nodeCount: number
  executionCount: number

  // 时间信息
  createdAt: string
  updatedAt: string

  // 权限信息
  owner: string
  isPublic: boolean
  canEdit: boolean
  canExecute: boolean
}

// 搜索和过滤参数
export interface WorkflowSearchParams {
  // 基本搜索
  query?: string
  
  // 分类过滤
  category?: string
  tags?: string[]
  
  // 状态过滤
  status?: string[]
  owner?: string
  
  // 时间过滤
  createdAfter?: string
  createdBefore?: string

  // 排序
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount'
  sortOrder?: 'asc' | 'desc'
  
  // 分页
  page?: number
  limit?: number
}

// 导出配置
export interface WorkflowExportConfig {
  format: 'json' | 'yaml' | 'pdf' | 'png'
  
  // 内容设置
  includeMetadata?: boolean
  includeConfig?: boolean
  includeResults?: boolean

  // 格式设置
  prettyPrint?: boolean
  compression?: boolean

  // PDF特定设置
  pdfLayout?: 'portrait' | 'landscape'
  pdfSize?: 'a4' | 'letter' | 'legal'

  // PNG特定设置
  imageScale?: number
  imageQuality?: number
}

// 权限和共享
export interface WorkflowPermissions {
  // 基本权限
  canView: boolean
  canEdit: boolean
  canExecute: boolean
  canDelete: boolean
  canShare: boolean

  // 共享设置
  isPublic: boolean
  sharedUsers: string[]
  sharedGroups: string[]

  // 访问控制
  ipWhitelist?: string[]
  timeRestrictions?: {
    startTime?: string
    endTime?: string
    daysOfWeek?: number[]
  }
}

// 通知配置
export interface NotificationConfig {
  // 通知类型
  email?: {
    enabled: boolean
    recipients: string[]
    template?: string
  }
  
  webhook?: {
    enabled: boolean
    url: string
    headers?: Record<string, string>
    retryCount?: number
  }

  slack?: {
    enabled: boolean
    webhookUrl: string
    channel?: string
    username?: string
  }

  // 触发条件
  onSuccess?: boolean
  onFailure?: boolean
  onCompletion?: boolean

  // 内容设置
  includeSummary?: boolean
  includeDetails?: boolean
  includeAttachments?: boolean
}
import { ApiResponse } from '@/types/api.types';

/**
 * 工作流组件数据类型定义
 * 基于后端API响应结构
 */
export interface WorkflowComponent {
  id: string;                    // 组件唯一标识符
  name: string;                  // 组件显示名称
  description: string;           // 组件功能描述
  category: string;              // 组件分类（网络扫描、漏洞扫描等）
  status: 'active' | 'inactive'; // 组件状态：启用/禁用
  icon: string;                  // 组件图标（Lucide React图标组件的名称字符串）
  commandTemplate: string;       // 命令模板
  placeholders: string[];        // 占位符列表
  createdAt: string;             // 创建时间
  updatedAt: string;             // 更新时间
}

/**
 * 向后兼容的类型别名
 * @deprecated 请使用 WorkflowComponent
 */
export interface CustomComponent extends WorkflowComponent {
  version?: string;      // 组件版本号 (已移除，保留兼容性)
  lastUpdate?: string;   // 最后更新时间 (已移除，保留兼容性)
  author?: string;       // 组件作者/提供方 (已移除，保留兼容性)
  tags?: string[];       // 组件标签数组 (已移除，保留兼容性)
}

/**
 * 组件分类统计
 */
export interface ComponentCategoryStats {
  category: string;
  count: number;
}

/**
 * 组件统计信息
 */
export interface ComponentStatistics {
  total: number;
  active: number;
  inactive: number;
  byCategory: ComponentCategoryStats[];
}

/**
 * 创建组件请求
 */
export interface CreateComponentRequest {
  name: string;
  description: string;
  category: string;
  icon: string;
  commandTemplate: string;
  status: 'active' | 'inactive';
}

/**
 * 更新组件请求
 */
export interface UpdateComponentRequest extends Partial<CreateComponentRequest> {
}

/**
 * 分页响应
 */
export interface PaginatedComponentResponse {
  data: WorkflowComponent[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}