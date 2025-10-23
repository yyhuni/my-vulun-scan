import { ColumnDef } from "@tanstack/react-table"
import { PaginationParams, PaginationInfo } from "./common.types"
import type { Organization } from "./organization.types"
import type { BatchCreateResponse } from "./api-response.types"

// 资产相关类型定义

// 基础资产类型（与前端驼峰命名规范一致）
// 注意：后端返回 snake_case，但响应拦截器会自动转换为 camelCase
export interface Asset {
  id: number
  name: string
  description: string
  createdAt: string  // 响应拦截器自动从 created_at 转换而来
  updatedAt: string  // 响应拦截器自动从 updated_at 转换而来
  organizations?: Organization[]  // 关联的组织列表（仅在 Preload 时返回）
  type?: string  // 资产类型：domain、ip、cidr
}

// 获取资产列表请求参数
export interface GetAssetsParams extends PaginationParams {
  organizationId: number
}

// 获取资产列表响应
export interface GetAssetsResponse {
  assets: Asset[]
  total: number
  page: number
  pageSize: number      // ✅ 使用驼峰命名
  totalPages: number    // ✅ 使用驼峰命名
}

// 获取所有资产请求参数
// 后端固定按更新时间降序排列，不支持自定义排序
export interface GetAllAssetsParams {
  page?: number
  pageSize?: number
}

// 获取所有资产响应
export interface GetAllAssetsResponse {
  assets: Asset[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 获取单个资产详情响应（后端直接返回 Asset 对象）
export type GetAssetByIDResponse = Asset

// 资产数据表格组件属性类型定义
export interface AssetDataTableProps {
  data: Asset[]                           // 资产数据数组
  columns: ColumnDef<Asset>[]             // 列定义数组
  onAddNew?: () => void                    // 添加新资产的回调函数
  onBulkDelete?: () => void                // 批量删除回调函数
  onSelectionChange?: (selectedRows: Asset[]) => void  // 选中行变化回调
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

// 资产批量创建响应（复用通用类型）
export type BatchCreateAssetsResponse = BatchCreateResponse

