// 工具类型定义
export interface Tool {
  id: number
  name: string              // 工具名称
  displayName: string       // 显示名称
  description: string       // 工具描述
  version: string           // 当前安装版本
  logo?: string             // 工具 Logo URL
  githubUrl?: string        // GitHub 链接
  licenseUrl?: string       // License 链接
  license?: string          // License 类型
  isDefault: boolean        // 是否为默认工具
  category?: string         // 工具类别
  status: 'active' | 'inactive' | 'updating'  // 工具状态
  createdAt: string
  updatedAt: string
}

// 工具列表响应类型
export interface ToolsResponse {
  tools: Tool[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 创建工具请求类型
export interface CreateToolRequest {
  name: string
  displayName: string
  description: string
  version: string
  githubUrl?: string
  licenseUrl?: string
  license?: string
  isDefault?: boolean
  category?: string
}

// 更新工具请求类型
export interface UpdateToolRequest {
  displayName?: string
  description?: string
  version?: string
  githubUrl?: string
  licenseUrl?: string
  license?: string
  category?: string
  status?: 'active' | 'inactive' | 'updating'
}

// 工具过滤类型
export type ToolFilter = 'all' | 'default' | 'custom'
