import type { Domain } from './domain.types'
import type { BatchCreateResponse } from './api-response.types'

export interface SubDomain {
  id: number
  createdAt: string    // 驼峰命名，api-client.ts 会自动从 created_at 转换
  updatedAt: string    // 驼峰命名，api-client.ts 会自动从 updated_at 转换
  name: string
  domainId: number     // 驼峰命名，api-client.ts 会自动从 domain_id 转换
  isRoot: boolean      // 驼峰命名，api-client.ts 会自动从 is_root 转换
  domain?: Domain
}

// 后端固定按更新时间降序排列，不支持自定义排序
export interface GetSubDomainsParams {
  id?: number | string
  domainId?: number
  organizationId?: number
  page?: number
  pageSize?: number
}

export interface GetSubDomainsResponse {
  subDomains: SubDomain[]
  total: number
  page: number
  pageSize: number
  totalPages: number  // 总页数，与其他模型保持一致
}

export interface CreateSubDomainsRequest {
  organizationId: number // 组织ID（必填）
  domainGroups: Array<{
    rootDomain: string
    subdomains: string[]
  }>
}

// 创建子域名响应（继承通用批量创建响应）
export interface CreateSubDomainsResponse extends BatchCreateResponse {
  // 继承的字段：message, totalRequested, newCreated, alreadyExisted
}

export interface BatchDeleteSubDomainsRequest {
  subdomainIds: number[]  // 需要删除的子域名ID列表
}

export interface BatchDeleteSubDomainsResponse {
  message: string
  deletedCount: number
  // 注意：后端不返回 subDomains 字段（性能优化，避免大规模数据场景下返回完整对象列表）
}
