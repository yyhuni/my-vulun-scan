import type {
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  XYPosition,
  NodeChange as ReactFlowNodeChange,
  EdgeChange as ReactFlowEdgeChange,
} from '@xyflow/react'

// 安全工具节点枚举（参考 Dify 的 BlockEnum）
export enum SecurityToolBlockEnum {
  // 控制流节点
  Start = 'workflow-start',
  End = 'workflow-end',
  
  // 输入输出节点
  TargetInput = 'target-input',
  ReportOutput = 'report-output',
  
  // 核心扫描节点
  CustomTool = 'custom-tool',        // 🔥 核心节点，参考 Dify Tool
  
  // 数据处理节点
  DataFilter = 'data-filter',
  DataMerge = 'data-merge',
}

// 控制模式枚举（参考 Dify ControlMode）
export enum ControlMode {
  Pointer = 'pointer',  // 指针模式：用于选择和拖拽节点
  Hand = 'hand',        // 手型模式：用于画布平移
}

// 节点运行状态（参考 Dify NodeRunningStatus）
export enum NodeRunningStatus {
  NotStart = 'not-start',
  Waiting = 'waiting',
  Running = 'running',
  Succeeded = 'succeeded',
  Failed = 'failed',
  Exception = 'exception',
}

// 工作流执行状态
export enum WorkflowExecutionStatus {
  Idle = 'idle',
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

// 执行类型枚举
export enum ExecutionType {
  CONTROL_START = 'control_start',   // 开始节点
  CONTROL_END = 'control_end',       // 结束节点
  COMMAND_EXEC = 'command_exec',     // 命令执行节点
}

// 通用节点类型（参考 Dify CommonNodeType）
export type CommonSecurityNodeType<T = {}> = {
  selected?: boolean
  // 移除通用字段，这些字段现在在节点根级别
  width?: number
  height?: number
  position?: XYPosition
} & T

// 工具参数输入（参考 Dify ToolVarInputs）
export type ToolVarInputs = Record<string, {
  type: 'variable' | 'constant'
  value?: string | any
}>

// 工具参数定义
export interface ToolParameter {
  name: string
  displayName: string
  type: 'string' | 'number' | 'boolean' | 'file' | 'array' | 'select' | 'password'
  required: boolean
  defaultValue?: any
  description?: string
  commandFlag?: string
  validation?: {
    pattern?: string
    min?: number
    max?: number
    options?: string[]
  }
}

// 自定义安全工具节点（精简版）
export type CustomToolNodeType = CommonSecurityNodeType & {
  // 核心执行信息
  commandTemplate: string

  // 分类和参数
  category: string
  placeholders: string[]

  // 组件引用（用于从组件库拖拽的节点）
  componentId?: string

  // 节点显示信息
  title?: string
  description?: string

  // 参数映射配置 - 优化后的对象结构
  parameterMappings?: {
    [parameterName: string]: {
      source: 'global_variable' | 'node_output' | 'static_value'
      value: string
      type: 'file_path' | 'directory_path' | 'number' | 'string' | 'boolean' | 'array' | 'json'
      description?: string
    }
  }
}

// 工作流变量定义
export interface WorkflowVariable {
  name: string
  value: string
  type: 'file_path' | 'number' | 'string'
  description?: string
}

// 工作流开始节点（参考 Dify StartNode）
export type WorkflowStartNodeType = CommonSecurityNodeType & {
  workflowConfig?: {
    name: string
    description?: string
    createdAt: string
    updatedAt: string
  }
  variables?: WorkflowVariable[]
  // 节点显示信息
  title?: string
  description?: string
}

// 工作流结束节点（参考 Dify EndNode）
export type WorkflowEndNodeType = CommonSecurityNodeType & {
  outputConfig?: {
    saveResults: boolean
    outputFormat: string
  }
  // 节点显示信息
  title?: string
  description?: string
}

// 目标输入节点类型
export type TargetInputNodeType = CommonSecurityNodeType & {
  targetConfig: {
    inputType: 'manual' | 'file' | 'api'
    targets: string[]
    targetFile?: string
    apiEndpoint?: string
  }
}

// 报告输出节点类型
export type ReportOutputNodeType = CommonSecurityNodeType & {
  reportConfig: {
    template: string
    format: 'html' | 'pdf' | 'json' | 'csv'
    includeSummary: boolean
    includeDetails: boolean
    emailRecipients?: string[]
  }
}

// 数据过滤节点类型
export type DataFilterNodeType = CommonSecurityNodeType & {
  filterConfig: {
    filterType: 'severity' | 'port' | 'service' | 'custom'
    filterRules: FilterRule[]
  }
}

// 数据合并节点类型
export type DataMergeNodeType = CommonSecurityNodeType & {
  mergeConfig: {
    mergeStrategy: 'union' | 'intersection' | 'custom'
    deduplicate: boolean
    mergeFields: string[]
  }
}

// 过滤规则
export interface FilterRule {
  field: string
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'in' | 'notIn'
  value: any
  logicOperator?: 'and' | 'or'
}

// 节点和边类型
export type SecurityNode<T = {}> = ReactFlowNode<CommonSecurityNodeType<T>> & {
  title: string
  description: string
  execution_type: ExecutionType
}
export type SecurityEdge = ReactFlowEdge<{
  hovering?: boolean
  runningStatus?: NodeRunningStatus
  sourceType: SecurityToolBlockEnum
  targetType: SecurityToolBlockEnum
}>

// 节点联合类型
export type AnySecurityNodeType = 
  | CustomToolNodeType
  | WorkflowStartNodeType
  | WorkflowEndNodeType
  | TargetInputNodeType
  | ReportOutputNodeType
  | DataFilterNodeType
  | DataMergeNodeType

// 节点属性类型
export type NodeProps<T = unknown> = { 
  id: string
  data: CommonSecurityNodeType<T> & {
    title?: string  // 添加title字段支持
    description?: string  // 添加description字段支持
  }
  selected?: boolean
}

// 节点配置面板属性类型
export type NodePanelProps<T> = {
  id: string
  data: CommonSecurityNodeType<T>
}

// 工作流数据更新类型
export type WorkflowDataUpdater = {
  nodes: SecurityNode[]
  edges: SecurityEdge[]
}

// 扫描结果接口
export interface ScanResult {
  nodeId: string
  toolName: string
  targets: string[]
  results: {
    vulnerabilities?: Vulnerability[]
    openPorts?: Port[]
    webInfo?: WebInfo[]
    domains?: Domain[]
    rawOutput?: string
  }
  status: 'success' | 'failed' | 'partial'
  executionTime: number
  timestamp: number
  errors?: string[]
}

// 漏洞信息
export interface Vulnerability {
  id: string
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  description: string
  target: string
  port?: number
  service?: string
  cveId?: string
  evidence?: string
}

// 端口信息
export interface Port {
  port: number
  protocol: 'tcp' | 'udp'
  state: 'open' | 'closed' | 'filtered'
  service?: string
  version?: string
  banner?: string
}

// Web信息
export interface WebInfo {
  url: string
  statusCode: number
  title?: string
  server?: string
  technologies?: string[]
  headers?: Record<string, string>
}

// 域名信息
export interface Domain {
  domain: string
  ipAddresses: string[]
  subdomains?: string[]
  dnsRecords?: DNSRecord[]
}

// DNS记录
export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS'
  value: string
  ttl?: number
}

// 工作流执行配置
export interface WorkflowExecutionConfig {
  parallelExecution: boolean
  maxConcurrentNodes: number
  timeoutPerNode: number
  retryFailedNodes: boolean
  maxRetries: number
  saveIntermediateResults: boolean
}

// 工作流执行结果
export interface WorkflowExecutionResult {
  id: string
  workflowId: string
  status: WorkflowExecutionStatus
  startTime: number
  endTime?: number
  executionConfig: WorkflowExecutionConfig
  nodeResults: Map<string, ScanResult>
  overallProgress: number
  errors?: string[]
}

// 值选择器（用于变量引用）
export type ValueSelector = string[] // [nodeId, key | obj key path]

// 变量定义
export interface Variable {
  variable: string
  label?: string | {
    nodeType: SecurityToolBlockEnum
    nodeName: string
    variable: string
  }
  valueSelector: ValueSelector
  variableType?: string
  value?: string
  options?: string[]
  required?: boolean
  isParagraph?: boolean
}

// 输入变量类型
export enum InputVarType {
  textInput = 'text-input',
  paragraph = 'paragraph',
  select = 'select',
  number = 'number',
  url = 'url',
  files = 'files',
  json = 'json',
  singleFile = 'file',
  multiFiles = 'file-list',
}

// 输入变量定义
export type InputVar = {
  type: InputVarType
  label: string | {
    nodeType: SecurityToolBlockEnum
    nodeName: string
    variable: string
  }
  variable: string
  maxLength?: number
  default?: string
  required: boolean
  hint?: string
  options?: string[]
  valueSelector?: ValueSelector
}

// 重新导出 React Flow 的 NodeChange 和 EdgeChange 类型
export type NodeChange = ReactFlowNodeChange
export type EdgeChange = ReactFlowEdgeChange 