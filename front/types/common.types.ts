// 通用类型定义

// 数据视图状态
export type ViewState = "loading" | "data" | "empty" | "error"

// 数据状态类型
export type DataViewState = "loading" | "success" | "error" | "empty"

// 分页参数
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

// 面包屑导航项
export interface BreadcrumbItemType {
  name: string
  href?: string
}

// 通用响应包装类型（扩展原有的 ApiResponse）
export interface ApiResponse<T = any> {
  code: string
  state: string
  message: string
  data?: T
}

// 表格列定义类型
export interface TableColumn<T> {
  key: keyof T
  title: string
  sortable?: boolean
  filterable?: boolean
  width?: number | string
  render?: (value: any, record: T, index: number) => React.ReactNode
}

// 筛选器选项
export interface FilterOption {
  label: string
  value: string
  count?: number
}

// 搜索参数
export interface SearchParams {
  query?: string
  filters?: Record<string, string | string[]>
  page?: number
  pageSize?: number
}

// 漏洞严重程度筛选器
export type SeverityFilter = "all" | "高危" | "中危" | "低危"

// 漏洞状态筛选器
export type VulnerabilityStatusFilter = "all" | "待修复" | "处理中" | "已修复" | "已忽略"

// 扫描状态筛选器
export type ScanStatusFilter = "all" | "已完成" | "进行中" | "失败" | "已取消"

// 扫描类型筛选器
export type ScanTypeFilter = "all" | "全面扫描" | "快速扫描" | "漏洞验证" | "自定义扫描"

// 子域名状态筛选器
export type SubdomainStatusFilter = "all" | "active" | "inactive" | "unknown"

// 通用操作结果
export interface OperationResult<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}
