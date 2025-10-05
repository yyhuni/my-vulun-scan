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
  subDomains: string[]
  domainId: number
}

export interface CreateSubDomainsResponse {
  successCount: number
  existingDomains: string[]
  totalRequested: number
  message: string
}
