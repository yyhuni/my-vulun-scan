import type { Domain } from './domain.types'

export interface SubDomain {
  id: number
  createdAt: string
  updatedAt: string
  name: string
  domainId: number
  domain?: Domain
}

export interface GetSubDomainsParams {
  id?: number | string
  domainId?: number
  organizationId?: number
  page?: number
  pageSize?: number
  sortBy?: 'id' | 'name' | 'createdAt' | 'updatedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface GetSubDomainsResponse {
  subDomains: SubDomain[]
  total: number
  page: number
  pageSize: number
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
