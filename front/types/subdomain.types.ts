import type { Domain } from './domain.types'

export interface SubDomain {
  id: number
  created_at: string
  updated_at: string
  name: string
  domain_id: number
  domain?: Domain
}

export interface GetSubDomainsParams {
  id?: number | string
  domainId?: number
  organizationId?: number
  page?: number
  pageSize?: number
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

export interface GetSubDomainsResponse {
  sub_domains: SubDomain[]
  total: number
  page: number
  page_size: number
}

export interface CreateSubDomainsRequest {
  sub_domains: string[]
  domain_id: number
}

export interface CreateSubDomainsResponse {
  success_count: number
  existing_domains: string[]
  total_requested: number
  message: string
}
