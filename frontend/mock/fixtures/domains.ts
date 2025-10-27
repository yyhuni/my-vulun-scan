/**
 * Mock 数据 - 域名
 */
import type { Domain } from '@/types/domain.types'

export const mockDomains: Domain[] = [
  {
    id: 1,
    name: 'www.aliyun.com',
    description: '阿里云主站',
    assetId: 1,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-10-20T15:30:00Z',
  },
  {
    id: 2,
    name: 'api.aliyun.com',
    description: '阿里云API',
    assetId: 1,
    createdAt: '2024-01-15T08:05:00Z',
    updatedAt: '2024-10-20T14:20:00Z',
  },
  {
    id: 3,
    name: '*.aliyun.com',
    description: '阿里云泛域名',
    assetId: 1,
    createdAt: '2024-01-15T08:10:00Z',
    updatedAt: '2024-10-19T16:45:00Z',
  },
  {
    id: 4,
    name: 'www.taobao.com',
    description: '淘宝主站',
    assetId: 2,
    createdAt: '2024-01-16T09:00:00Z',
    updatedAt: '2024-10-18T12:30:00Z',
  },
  {
    id: 5,
    name: 'login.taobao.com',
    description: '淘宝登录',
    assetId: 2,
    createdAt: '2024-01-16T09:05:00Z',
    updatedAt: '2024-10-17T10:15:00Z',
  },
  {
    id: 6,
    name: 'www.qq.com',
    description: 'QQ主站',
    assetId: 4,
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-10-16T14:50:00Z',
  },
  {
    id: 7,
    name: 'www.douyin.com',
    description: '抖音主站',
    assetId: 6,
    createdAt: '2024-02-01T09:30:00Z',
    updatedAt: '2024-10-15T16:30:00Z',
  },
]

/**
 * 根据ID获取域名
 */
export function getDomainById(id: number): Domain | undefined {
  return mockDomains.find(domain => domain.id === id)
}

/**
 * 根据资产ID获取域名列表
 */
export function getDomainsByAssetId(assetId: number, page = 1, pageSize = 10) {
  const filtered = mockDomains.filter(domain => domain.assetId === assetId)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filtered.slice(startIndex, endIndex)
  
  return {
    domains: paginatedData,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

/**
 * 根据组织ID获取域名列表
 */
export function getDomainsByOrganizationId(organizationId: number, page = 1, pageSize = 10) {
  const filtered = mockDomains.filter(domain => domain.organizationId === organizationId)
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = filtered.slice(startIndex, endIndex)
  
  return {
    domains: paginatedData,
    total: filtered.length,
    page,
    pageSize,
    totalPages: Math.ceil(filtered.length / pageSize),
  }
}

