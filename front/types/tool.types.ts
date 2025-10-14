// 工具类型定义（匹配后端 API）
export interface Tool {
  id: number
  name: string              // 工具名称
  repoUrl: string          // 仓库地址
  version: string           // 版本号
  description: string       // 工具描述
  categoryName: string      // 分类名称
  createdAt: string
  updatedAt: string
}

// 工具分类名称到中文的映射
export const CategoryNameMap: Record<string, string> = {
  subdomain: '子域名扫描',
  vulnerability: '漏洞扫描',
  port: '端口扫描',
  directory: '目录扫描',
  dns: 'DNS解析',
  http: 'HTTP探测',
  crawler: '网页爬虫',
  recon: '信息收集',
  fuzzer: '模糊测试',
  wordlist: '字典生成',
  screenshot: '截图工具',
  exploit: '漏洞利用',
  network: '网络扫描',
  other: '其他',
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
  repoUrl?: string
  version?: string
  description?: string
  categoryName?: string
}

// 获取分类列表响应
export interface CategoriesResponse {
  categories: string[]  // 分类名称数组
  total: number
}

// 工具查询参数
export interface GetToolsParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 工具过滤类型
export type ToolFilter = 'all' | 'default' | 'custom'
