import { ColumnDef } from "@tanstack/react-table"
import { PaginationParams, PaginationInfo } from "./common.types"
import type { Organization } from "./organization.types"

// 域名相关类型定义

// 基础域名类型（与前端驼峰命名规范一致）
// 注意：后端返回 snake_case，但响应拦截器会自动转换为 camelCase
export interface Domain {
  id: number
  name: string
  description: string
  createdAt: string  // 响应拦截器自动从 created_at 转换而来
  updatedAt: string  // 响应拦截器自动从 updated_at 转换而来
  organizations?: Organization[]  // 关联的组织列表（仅在 Preload 时返回）
}

// 获取域名列表请求参数
export interface GetDomainsParams extends PaginationParams {
  organizationId: number
}

// 获取域名列表响应
export interface GetDomainsResponse {
  domains: Domain[]
  total: number
  page: number
  pageSize: number      // ✅ 使用驼峰命名
  totalPages: number    // ✅ 使用驼峰命名
}

// 获取所有域名请求参数
export interface GetAllDomainsParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: string
}

// 获取所有域名响应
export interface GetAllDomainsResponse {
  domains: Domain[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 域名数据表格组件属性类型定义
export interface DomainDataTableProps {
  data: Domain[]                           // 域名数据数组
  columns: ColumnDef<Domain>[]             // 列定义数组
  onAddNew?: () => void                    // 添加新域名的回调函数
  onBulkDelete?: () => void                // 批量删除回调函数
  onSelectionChange?: (selectedRows: Domain[]) => void  // 选中行变化回调
  searchPlaceholder?: string               // 搜索框占位符
  searchColumn?: string                    // 搜索的列名
  // 添加分页相关属性
  pagination?: {
    pageIndex: number
    pageSize: number
  }
  setPagination?: (pagination: { pageIndex: number; pageSize: number }) => void
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
}
