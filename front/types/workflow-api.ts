/**
 * 工作流相关的API接口类型定义
 *
 * 此文件定义了前端与后端交互的所有数据结构和接口
 * 后端开发者可以参考这些类型定义来实现对应的API接口
 */

// 导入通用API类型
import type { ApiResponse, PaginatedResponse, ApiError } from './api.types'

// ===== 基础类型定义 =====

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 分页响应结构已从 api.types.ts 导入

// ===== 工作流相关类型 =====

/**
 * 工作流基础信息
 */
export interface WorkflowInfo {
  id: string
  name: string
  description: string
  status: 'draft' | 'published' | 'archived'
  createdAt: string
  updatedAt: string
  createdBy: string
  tags?: string[]
  version: string
}

/**
 * 工作流详细数据（包含节点和连接）
 */
export interface WorkflowData extends WorkflowInfo {
  nodes: WorkflowNodeData[]
  edges: WorkflowEdgeData[]
  metadata: {
    nodeCount: number
    edgeCount: number
    lastExecutedAt?: string
    executionCount: number
  }
}

/**
 * 工作流节点数据
 * 注意：不包含position字段，加载时使用自动布局
 */
export interface WorkflowNodeData {
  id: string
  type: string
  // position: 不保存位置信息，使用自动布局
  data: {
    title: string
    desc: string
    type: string
    // 自定义工具节点字段
    componentId?: string
    category?: string
    commandTemplate?: string
    placeholders?: string[]
    outputFormat?: 'json' | 'xml' | 'txt' | 'raw'
    // 参数映射配置
    parameterMappings?: Array<{
      placeholder: string
      value: string
      type: 'file_path' | 'number' | 'string'
    }>
    // 开始节点配置
    workflowConfig?: {
      name: string
      description?: string
      createdAt: string
      updatedAt: string
    }
    // 开始节点的变量定义
    variables?: Array<{
      name: string
      value: string
      type: 'file_path' | 'number' | 'string'
      description?: string
    }>
    // 结束节点配置
    outputConfig?: {
      saveResults: boolean
      outputFormat: string
    }
  }
}

/**
 * 工作流连接数据
 */
export interface WorkflowEdgeData {
  id: string
  source: string
  target: string
  type: string
  data?: {
    sourceType: string
    targetType: string
    // 运行时状态
    runningStatus?: string
    hovering?: boolean
  }
}

// ===== 工作流执行相关 =====

/**
 * 工作流执行请求参数
 */
export interface WorkflowExecutionRequest {
  workflowId: string
  config?: {
    mode: 'full' | 'partial'
    startNodeId?: string
    endNodeId?: string
    parameters?: Record<string, any>
  }
}

/**
 * 工作流执行响应
 */
export interface WorkflowExecutionResponse {
  executionId: string
  status: 'started' | 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  estimatedDuration?: number
  progress?: {
    totalNodes: number
    completedNodes: number
    failedNodes: number
    currentNode?: string
  }
}

/**
 * 工作流执行状态
 */
export interface WorkflowExecutionStatus {
  executionId: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: string
  completedAt?: string
  duration?: number
  progress: {
    totalNodes: number
    completedNodes: number
    failedNodes: number
    runningNodes: number
    currentNode?: string
  }
  nodeStatuses: Record<string, {
    status: 'notStart' | 'waiting' | 'running' | 'succeeded' | 'failed' | 'exception'
    startedAt?: string
    completedAt?: string
    duration?: number
    error?: string
  }>
}

// ===== 日志相关 =====

/**
 * 工作流日志条目
 */
export interface WorkflowLogEntry {
  id: string
  workflowId: string
  executionId?: string
  nodeId?: string
  nodeName?: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: string
  source?: string
  metadata?: Record<string, any>
}

/**
 * 节点日志条目
 */
export interface NodeLogEntry {
  id: string
  nodeId: string
  executionId: string
  level: 'info' | 'warning' | 'error' | 'debug' | 'command'
  message: string
  timestamp: string
  source?: string
  data?: any
}

/**
 * 日志查询参数
 */
export interface LogQueryParams extends PaginationParams {
  workflowId?: string
  executionId?: string
  nodeId?: string
  level?: string
  startTime?: string
  endTime?: string
  keyword?: string
}

// ===== 组件库相关 =====

/**
 * 工具组件信息
 */
export interface ToolComponent {
  id: string
  name: string
  description: string
  category: string
  version: string
  icon?: string
  tags?: string[]
  // 组件配置模板
  configTemplate: {
    parameters: Array<{
      name: string
      type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'file'
      label: string
      description?: string
      required: boolean
      defaultValue?: any
      options?: Array<{ label: string; value: any }>
      validation?: {
        min?: number
        max?: number
        pattern?: string
        message?: string
      }
    }>
    commandTemplate?: string
    outputFormat?: string
  }
  // 运行时配置
  runtime: {
    image?: string
    command?: string
    timeout?: number
    resources?: {
      cpu?: string
      memory?: string
    }
  }
}

// ===== API接口定义 =====

/**
 * 工作流管理API接口
 */
export interface WorkflowApiInterface {
  // 工作流CRUD
  getWorkflows(params?: PaginationParams & { status?: string; keyword?: string }): Promise<ApiResponse<PaginatedResponse<WorkflowInfo>>>
  getWorkflow(id: string): Promise<ApiResponse<WorkflowData>>
  createWorkflow(data: Omit<WorkflowData, 'id' | 'createdAt' | 'updatedAt' | 'metadata'>): Promise<ApiResponse<WorkflowData>>
  updateWorkflow(id: string, data: Partial<WorkflowData>): Promise<ApiResponse<WorkflowData>>
  deleteWorkflow(id: string): Promise<ApiResponse<void>>
  
  // 工作流执行
  executeWorkflow(request: WorkflowExecutionRequest): Promise<ApiResponse<WorkflowExecutionResponse>>
  getExecutionStatus(executionId: string): Promise<ApiResponse<WorkflowExecutionStatus>>
  cancelExecution(executionId: string): Promise<ApiResponse<void>>
  
  // 工作流操作
  publishWorkflow(id: string): Promise<ApiResponse<WorkflowData>>
  archiveWorkflow(id: string): Promise<ApiResponse<WorkflowData>>
  cloneWorkflow(id: string, name: string): Promise<ApiResponse<WorkflowData>>
  exportWorkflow(id: string): Promise<ApiResponse<{ downloadUrl: string }>>
  importWorkflow(file: File): Promise<ApiResponse<WorkflowData>>
}

/**
 * 日志管理API接口
 */
export interface LogApiInterface {
  // 工作流日志
  getWorkflowLogs(params: LogQueryParams): Promise<ApiResponse<PaginatedResponse<WorkflowLogEntry>>>
  addWorkflowLog(log: Omit<WorkflowLogEntry, 'id' | 'timestamp'>): Promise<ApiResponse<WorkflowLogEntry>>
  clearWorkflowLogs(workflowId: string, executionId?: string): Promise<ApiResponse<void>>
  exportWorkflowLogs(workflowId: string, executionId?: string): Promise<ApiResponse<{ downloadUrl: string }>>
  
  // 节点日志
  getNodeLogs(nodeId: string, executionId?: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<NodeLogEntry>>>
  addNodeLog(log: Omit<NodeLogEntry, 'id' | 'timestamp'>): Promise<ApiResponse<NodeLogEntry>>
  clearNodeLogs(nodeId: string, executionId?: string): Promise<ApiResponse<void>>
  exportNodeLogs(nodeId: string, executionId?: string): Promise<ApiResponse<{ downloadUrl: string }>>
}

/**
 * 组件库API接口
 */
export interface ComponentApiInterface {
  // 组件管理
  getComponents(category?: string): Promise<ApiResponse<ToolComponent[]>>
  getComponent(id: string): Promise<ApiResponse<ToolComponent>>
  createComponent(data: Omit<ToolComponent, 'id'>): Promise<ApiResponse<ToolComponent>>
  updateComponent(id: string, data: Partial<ToolComponent>): Promise<ApiResponse<ToolComponent>>
  deleteComponent(id: string): Promise<ApiResponse<void>>
  
  // 组件分类
  getCategories(): Promise<ApiResponse<Array<{ id: string; name: string; count: number }>>>
}

// ===== WebSocket事件类型 =====

/**
 * WebSocket消息类型
 */
export type WebSocketMessage = 
  | WorkflowExecutionStatusMessage
  | WorkflowLogMessage
  | NodeLogMessage
  | NodeStatusMessage

/**
 * 工作流执行状态更新消息
 */
export interface WorkflowExecutionStatusMessage {
  type: 'workflow_execution_status'
  data: WorkflowExecutionStatus
}

/**
 * 工作流日志消息
 */
export interface WorkflowLogMessage {
  type: 'workflow_log'
  data: WorkflowLogEntry
}

/**
 * 节点日志消息
 */
export interface NodeLogMessage {
  type: 'node_log'
  data: NodeLogEntry
}

/**
 * 节点状态更新消息
 */
export interface NodeStatusMessage {
  type: 'node_status'
  data: {
    nodeId: string
    executionId: string
    status: 'notStart' | 'waiting' | 'running' | 'succeeded' | 'failed' | 'exception'
    timestamp: string
    error?: string
  }
}

// ===== 错误类型 =====

// API错误类型已从 api.types.ts 导入

/**
 * 常见错误代码
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  
  // 工作流错误
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  WORKFLOW_INVALID = 'WORKFLOW_INVALID',
  WORKFLOW_EXECUTION_FAILED = 'WORKFLOW_EXECUTION_FAILED',
  WORKFLOW_ALREADY_RUNNING = 'WORKFLOW_ALREADY_RUNNING',
  
  // 节点错误
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  NODE_CONFIGURATION_INVALID = 'NODE_CONFIGURATION_INVALID',
  NODE_EXECUTION_FAILED = 'NODE_EXECUTION_FAILED',
  NODE_TIMEOUT = 'NODE_TIMEOUT',
  
  // 组件错误
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  COMPONENT_INVALID = 'COMPONENT_INVALID',
  COMPONENT_RUNTIME_ERROR = 'COMPONENT_RUNTIME_ERROR'
} 