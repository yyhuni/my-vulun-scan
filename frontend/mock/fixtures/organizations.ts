/**
 * Mock 数据 - 组织
 */
import type { Organization } from '@/types/organization.types'

export const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: '阿里巴巴集团',
    description: '全球领先的电商和云计算公司',
    assetCount: 156,
    domainCount: 89,
    endpointCount: 1234,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-10-20T15:30:00Z',
  },
  {
    id: 2,
    name: '腾讯控股',
    description: '中国最大的互联网综合服务提供商',
    assetCount: 234,
    domainCount: 145,
    endpointCount: 2567,
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-10-19T12:00:00Z',
  },
  {
    id: 3,
    name: '字节跳动',
    description: '全球化的科技企业',
    assetCount: 178,
    domainCount: 98,
    endpointCount: 1876,
    createdAt: '2024-02-01T09:30:00Z',
    updatedAt: '2024-10-18T16:45:00Z',
  },
  {
    id: 4,
    name: '华为技术',
    description: '全球领先的ICT（信息与通信）基础设施和智能终端提供商',
    assetCount: 298,
    domainCount: 187,
    endpointCount: 3456,
    createdAt: '2024-02-10T14:00:00Z',
    updatedAt: '2024-10-17T11:20:00Z',
  },
  {
    id: 5,
    name: '百度公司',
    description: '中国领先的人工智能公司',
    assetCount: 123,
    domainCount: 67,
    endpointCount: 987,
    createdAt: '2024-02-15T11:00:00Z',
    updatedAt: '2024-10-16T09:15:00Z',
  },
  {
    id: 6,
    name: '美团',
    description: '中国领先的生活服务电商平台',
    assetCount: 145,
    domainCount: 78,
    endpointCount: 1234,
    createdAt: '2024-03-01T13:30:00Z',
    updatedAt: '2024-10-15T14:50:00Z',
  },
  {
    id: 7,
    name: '京东集团',
    description: '中国领先的综合零售商',
    assetCount: 189,
    domainCount: 102,
    endpointCount: 1678,
    createdAt: '2024-03-10T10:00:00Z',
    updatedAt: '2024-10-14T16:30:00Z',
  },
  {
    id: 8,
    name: '小米科技',
    description: '全球领先的智能手机和智能硬件制造商',
    assetCount: 167,
    domainCount: 89,
    endpointCount: 1456,
    createdAt: '2024-03-20T15:00:00Z',
    updatedAt: '2024-10-13T10:40:00Z',
  },
]

/**
 * 根据ID获取组织
 */
export function getOrganizationById(id: number): Organization | undefined {
  return mockOrganizations.find(org => org.id === id)
}

/**
 * 获取分页的组织列表
 */
export function getPaginatedOrganizations(page = 1, pageSize = 10) {
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedData = mockOrganizations.slice(startIndex, endIndex)
  
  return {
    organizations: paginatedData,
    total: mockOrganizations.length,
    page,
    pageSize,
    totalPages: Math.ceil(mockOrganizations.length / pageSize),
  }
}

/**
 * 创建新组织（模拟）
 */
export function createOrganization(data: { name: string; description: string }): Organization {
  const newId = Math.max(...mockOrganizations.map(o => o.id)) + 1
  const now = new Date().toISOString()
  
  const newOrg: Organization = {
    id: newId,
    name: data.name,
    description: data.description,
    assetCount: 0,
    domainCount: 0,
    endpointCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  
  mockOrganizations.unshift(newOrg)
  return newOrg
}

/**
 * 更新组织（模拟）
 */
export function updateOrganization(id: number, data: { name: string; description: string }): Organization | null {
  const index = mockOrganizations.findIndex(org => org.id === id)
  if (index === -1) return null
  
  mockOrganizations[index] = {
    ...mockOrganizations[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }
  
  return mockOrganizations[index]
}

/**
 * 删除组织（模拟）
 */
export function deleteOrganization(id: number): boolean {
  const index = mockOrganizations.findIndex(org => org.id === id)
  if (index === -1) return false
  
  mockOrganizations.splice(index, 1)
  return true
}

/**
 * 批量删除组织（模拟）
 */
export function batchDeleteOrganizations(ids: number[]): number {
  let deletedCount = 0
  ids.forEach(id => {
    if (deleteOrganization(id)) {
      deletedCount++
    }
  })
  return deletedCount
}

