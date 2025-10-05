import { ColumnDef } from "@tanstack/react-table"
import { PaginationInfo } from "./common.types"

// 组织相关类型定义
export interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
  domainCount?: number
  status?: string
}

// 组织列表响应类型（匹配后端GetOrganizationsResponse）
export interface OrganizationsResponse<T> {
  organizations: T[]    // 组织数据列表
  total: number         // 总记录数
  page: number          // 当前页码（从1开始）
  pageSize: number      // 每页大小
  totalPages: number    // 总页数
}


// 组织数据表格组件属性类型定义
export interface OrganizationDataTableProps {
  data: Organization[]                           // 组织数据数组
  columns: ColumnDef<Organization>[]             // 列定义数组
  onAddNew?: () => void                          // 添加新组织的回调函数
  onBulkDelete?: () => void                      // 批量删除回调函数
  onSelectionChange?: (selectedRows: Organization[]) => void  // 选中行变化回调
  searchPlaceholder?: string                     // 搜索框占位符
  searchColumn?: string                          // 搜索的列名
  // 添加分页相关属性
  pagination?: {
    pageIndex: number
    pageSize: number
  }
  setPagination?: (pagination: { pageIndex: number; pageSize: number }) => void
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
}
