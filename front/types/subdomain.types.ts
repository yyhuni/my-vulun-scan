import type { Domain } from './domain.types'

export interface SubDomain {
  id: number
  createdAt: string    // 驼峰命名，api-client.ts 会自动从 created_at 转换
  updatedAt: string    // 驼峰命名，api-client.ts 会自动从 updated_at 转换
  name: string
  domainId: number     // 驼峰命名，api-client.ts 会自动从 domain_id 转换
  domain?: Domain
}

export interface GetSubDomainsParams {
  id?: number | string
  domainId?: number
  organizationId?: number
  page?: number
  pageSize?: number
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at'  // 使用下划线命名以匹配后端
  sortOrder?: 'asc' | 'desc'
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

export interface CreateSubDomainsResponse {
  subdomainsCreated: number     // 实际创建的子域名数量
  alreadyExists: number          // 已存在的子域名数量
  skippedDomains: string[]       // 被跳过的根域名列表
  totalUniqueSubdomains: number  // 请求的唯一子域名总数
}

export interface BatchDeleteSubDomainsRequest {
  subdomainIds: number[]  // 需要删除的子域名ID列表
}

export interface BatchDeleteSubDomainsResponse {
  message: string
  deletedCount: number
  // 注意：后端不返回 subDomains 字段（性能优化，避免大规模数据场景下返回完整对象列表）
}
