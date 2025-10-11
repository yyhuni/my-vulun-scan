import { PaginationParams } from "./common.types"

// 域名相关类型定义

// 基础域名类型（与后端响应结构保持一致）
export interface Domain {
  id: number
  name: string
  description: string
  created_at: string  // 使用下划线命名，与后端 API 响应一致
  updated_at: string  // 使用下划线命名，与后端 API 响应一致
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
