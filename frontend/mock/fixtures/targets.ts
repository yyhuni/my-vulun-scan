/**
 * Mock Fixtures - Targets
 */
import type { Target, BatchDeleteTargetsResponse } from '../../types/target.types'

// Mock 目标数据
let mockTargets: Target[] = [
  {
    id: 1,
    name: 'example.com',
    type: 'domain',
    organizations: [
      { id: 1, name: '技术部' },
      { id: 2, name: '产品部' },
    ],
    domainCount: 15,
    endpointCount: 120,
    description: '主要业务域名',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: '192.168.1.0/24',
    type: 'cidr',
    organizations: [
      { id: 1, name: '技术部' },
    ],
    domainCount: 0,
    endpointCount: 50,
    description: '内网 IP 段',
    createdAt: '2024-02-10T10:30:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    name: '10.0.0.1',
    type: 'ip',
    organizations: [
      { id: 3, name: '运维部' },
    ],
    domainCount: 0,
    endpointCount: 8,
    description: '服务器 IP',
    createdAt: '2024-02-20T14:15:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: 'api.example.com',
    type: 'domain',
    organizations: [
      { id: 1, name: '技术部' },
      { id: 2, name: '产品部' },
    ],
    domainCount: 8,
    endpointCount: 85,
    description: 'API 服务域名',
    createdAt: '2024-03-01T09:20:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    name: '172.16.0.0/16',
    type: 'cidr',
    organizations: [
      { id: 3, name: '运维部' },
    ],
    domainCount: 0,
    endpointCount: 200,
    description: '测试环境网段',
    createdAt: '2024-03-05T11:45:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    name: 'cdn.example.com',
    type: 'domain',
    organizations: [
      { id: 2, name: '产品部' },
    ],
    domainCount: 3,
    endpointCount: 45,
    description: 'CDN 加速域名',
    createdAt: '2024-03-10T16:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 7,
    name: '203.0.113.1',
    type: 'ip',
    organizations: [
      { id: 1, name: '技术部' },
    ],
    domainCount: 0,
    endpointCount: 12,
    description: '公网服务器',
    createdAt: '2024-03-15T13:30:00Z',
    updatedAt: new Date().toISOString(),
  },
]

let nextId = 8

/**
 * 获取所有目标（分页）
 */
export function getAllTargets(page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const results = mockTargets.slice(start, end)

  return {
    count: mockTargets.length,
    next: end < mockTargets.length ? `/api/targets/?page=${page + 1}&pageSize=${pageSize}` : null,
    previous: page > 1 ? `/api/targets/?page=${page - 1}&pageSize=${pageSize}` : null,
    results,
  }
}

/**
 * 根据 ID 获取目标
 */
export function getTargetById(id: number): Target | undefined {
  return mockTargets.find((target) => target.id === id)
}

/**
 * 创建目标
 */
export function createTarget(data: {
  name: string
  type: 'domain' | 'ip' | 'cidr'
  organizationIds: number[]
  description?: string
}): Target {
  const newTarget: Target = {
    id: nextId++,
    name: data.name,
    type: data.type,
    organizations: data.organizationIds.map((id) => ({
      id,
      name: `组织 ${id}`,
    })),
    domainCount: 0,
    endpointCount: 0,
    description: data.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockTargets.push(newTarget)
  return newTarget
}

/**
 * 更新目标
 */
export function updateTarget(
  id: number,
  data: {
    name?: string
    type?: 'domain' | 'ip' | 'cidr'
    organizationIds?: number[]
    description?: string
  }
): Target | null {
  const index = mockTargets.findIndex((target) => target.id === id)

  if (index === -1) {
    return null
  }

  const updated: Target = {
    ...mockTargets[index],
    ...data,
    organizations: data.organizationIds
      ? data.organizationIds.map((id) => ({
          id,
          name: `组织 ${id}`,
        }))
      : mockTargets[index].organizations,
    updatedAt: new Date().toISOString(),
  }

  mockTargets[index] = updated
  return updated
}

/**
 * 删除目标
 */
export function deleteTarget(id: number): boolean {
  const index = mockTargets.findIndex((target) => target.id === id)

  if (index === -1) {
    return false
  }

  mockTargets.splice(index, 1)
  return true
}

/**
 * 批量删除目标
 */
export function batchDeleteTargets(targetIds: number[]): BatchDeleteTargetsResponse {
  const initialCount = mockTargets.length
  const failedIds: number[] = []

  targetIds.forEach((id) => {
    const success = deleteTarget(id)
    if (!success) {
      failedIds.push(id)
    }
  })

  const deletedCount = initialCount - mockTargets.length

  return {
    deletedCount,
    failedIds: failedIds.length > 0 ? failedIds : undefined,
  }
}

/**
 * 获取目标的组织列表
 */
export function getTargetOrganizations(targetId: number, page: number, pageSize: number) {
  const target = getTargetById(targetId)

  if (!target) {
    return {
      count: 0,
      next: null,
      previous: null,
      results: [],
    }
  }

  const start = (page - 1) * pageSize
  const end = start + pageSize
  const results = target.organizations.slice(start, end)

  return {
    count: target.organizations.length,
    next:
      end < target.organizations.length
        ? `/api/targets/${targetId}/organizations/?page=${page + 1}&pageSize=${pageSize}`
        : null,
    previous: page > 1 ? `/api/targets/${targetId}/organizations/?page=${page - 1}&pageSize=${pageSize}` : null,
    results,
  }
}

/**
 * 关联目标与组织
 */
export function linkTargetOrganizations(targetId: number, organizationIds: number[]) {
  const target = getTargetById(targetId)

  if (!target) {
    return null
  }

  // 添加新组织（避免重复）
  const existingIds = new Set(target.organizations.map((org) => org.id))
  const newOrgs = organizationIds
    .filter((id) => !existingIds.has(id))
    .map((id) => ({ id, name: `组织 ${id}` }))

  target.organizations.push(...newOrgs)
  target.updatedAt = new Date().toISOString()

  return { message: `成功关联 ${newOrgs.length} 个组织` }
}

/**
 * 取消目标与组织的关联
 */
export function unlinkTargetOrganizations(targetId: number, organizationIds: number[]) {
  const target = getTargetById(targetId)

  if (!target) {
    return null
  }

  const idsToRemove = new Set(organizationIds)
  const originalCount = target.organizations.length

  target.organizations = target.organizations.filter((org) => !idsToRemove.has(org.id))
  target.updatedAt = new Date().toISOString()

  const removedCount = originalCount - target.organizations.length

  return { message: `成功取消 ${removedCount} 个组织的关联` }
}

